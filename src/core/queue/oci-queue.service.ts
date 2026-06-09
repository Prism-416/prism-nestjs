import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as queue from 'oci-queue';
import {
  buildOciAuthenticationDetailsProvider,
  readOciAuthenticationConfig,
} from '@/core/oci';
import {
  OCI_QUEUE_ENV_BY_KIND,
  OciQueueKind,
} from '@/core/queue/oci-queue.constants';
import {
  ConsumedQueueMessage,
  ConsumeQueueMessagesInput,
  DeleteQueueMessageInput,
  OciQueueMessageInput,
  OciQueueMessageMetadata,
  PublishQueueMessagesInput,
  PublishQueueMessagesResult,
  UpdateQueueMessageVisibilityInput,
} from '@/core/queue/oci-queue.types';

type QueueContext = {
  queueId: string;
  messagesEndpoint: string;
};

type QueueContextInput = {
  queueId?: string;
  messagesEndpoint?: string;
  queueKind?: OciQueueKind;
};

@Injectable()
export class OciQueueService {
  private readonly logger = new Logger(OciQueueService.name);
  private readonly enabled =
    (this.getEnv('QUEUE_ENABLED') ?? 'false').toLowerCase() === 'true';
  private readonly ociConfig = readOciAuthenticationConfig((key) =>
    this.getEnv(key),
  );
  private readonly authMode = this.ociConfig.authMode;
  private readonly regionId = this.ociConfig.regionId;

  private adminClient?: queue.QueueAdminClient;
  private adminClientPromise?: Promise<queue.QueueAdminClient>;
  private readonly queueClients = new Map<string, queue.QueueClient>();
  private readonly queueClientPromises = new Map<
    string,
    Promise<queue.QueueClient>
  >();
  private readonly messagesEndpointByQueueId = new Map<string, string>();

  async publishMessages(
    input: PublishQueueMessagesInput,
  ): Promise<PublishQueueMessagesResult> {
    this.ensureEnabled();

    if (input.messages.length === 0) {
      throw new InternalServerErrorException(
        'At least one queue message is required.',
      );
    }

    const context = await this.resolveQueueContext(input);
    try {
      const client = await this.getQueueClient(context.messagesEndpoint);
      const response = await client.putMessages({
        queueId: context.queueId,
        putMessagesDetails: {
          messages: input.messages.map((message) =>
            this.mapPublishableMessage(message),
          ),
        },
        opcRequestId: input.opcRequestId,
      });

      return {
        messages: response.putMessages.messages.map((message) => ({
          id: message.id,
          expireAfter: message.expireAfter,
        })),
        opcRequestId: response.opcRequestId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(this.formatQueueFailureMessage(err, context.queueId));
      throw new InternalServerErrorException(
        'Failed to publish queue messages.',
      );
    }
  }

  async consumeMessages(
    input: ConsumeQueueMessagesInput = {},
  ): Promise<ConsumedQueueMessage[]> {
    this.ensureEnabled();

    const context = await this.resolveQueueContext(input);
    try {
      const client = await this.getQueueClient(context.messagesEndpoint);
      const response = await client.getMessages({
        queueId: context.queueId,
        visibilityInSeconds: input.visibilityInSeconds,
        timeoutInSeconds: input.timeoutInSeconds,
        limit: input.limit,
        channelFilter: input.channelFilter,
        consumerGroupId: input.consumerGroupId,
        opcRequestId: input.opcRequestId,
      });

      return response.getMessages.messages.map((message) => ({
        id: message.id,
        content: message.content,
        receipt: message.receipt,
        deliveryCount: message.deliveryCount,
        visibleAfter: message.visibleAfter,
        expireAfter: message.expireAfter,
        createdAt: message.createdAt,
        metadata: message.metadata
          ? {
              channelId: message.metadata.channelId,
              customProperties: message.metadata.customProperties,
            }
          : undefined,
      }));
    } catch (error) {
      const err = error as Error;
      this.logger.error(this.formatQueueFailureMessage(err, context.queueId));
      throw new InternalServerErrorException(
        'Failed to consume queue messages.',
      );
    }
  }

  async deleteMessage(input: DeleteQueueMessageInput): Promise<void> {
    this.ensureEnabled();

    const context = await this.resolveQueueContext(input);
    try {
      const client = await this.getQueueClient(context.messagesEndpoint);
      await client.deleteMessage({
        queueId: context.queueId,
        messageReceipt: input.receipt,
        consumerGroupId: input.consumerGroupId,
        opcRequestId: input.opcRequestId,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(this.formatQueueFailureMessage(err, context.queueId));
      throw new InternalServerErrorException('Failed to delete queue message.');
    }
  }

  async updateMessageVisibility(
    input: UpdateQueueMessageVisibilityInput,
  ): Promise<void> {
    this.ensureEnabled();

    const context = await this.resolveQueueContext(input);
    try {
      const client = await this.getQueueClient(context.messagesEndpoint);
      await client.updateMessage({
        queueId: context.queueId,
        messageReceipt: input.receipt,
        updateMessageDetails: {
          visibilityInSeconds: input.visibilityInSeconds,
        },
        consumerGroupId: input.consumerGroupId,
        opcRequestId: input.opcRequestId,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(this.formatQueueFailureMessage(err, context.queueId));
      throw new InternalServerErrorException(
        'Failed to update queue message visibility.',
      );
    }
  }

  private ensureEnabled(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'OCI queue is disabled. Set QUEUE_ENABLED=true.',
      );
    }
  }

  private mapPublishableMessage(message: OciQueueMessageInput): {
    content: string;
    metadata?: OciQueueMessageMetadata;
  } {
    if (!message.content) {
      throw new InternalServerErrorException(
        'Queue message content is required.',
      );
    }

    return {
      content: message.content,
      metadata: this.mapMessageMetadata(message.metadata),
    };
  }

  private mapMessageMetadata(
    metadata: OciQueueMessageMetadata | undefined,
  ): OciQueueMessageMetadata | undefined {
    if (!metadata) {
      return undefined;
    }

    return {
      channelId: metadata.channelId,
      customProperties: metadata.customProperties,
    };
  }

  private async resolveQueueContext(
    input: QueueContextInput,
  ): Promise<QueueContext> {
    const queueId = this.resolveQueueId(input);
    const explicitMessagesEndpoint = this.normalizeMessagesEndpoint(
      input.messagesEndpoint,
    );
    if (explicitMessagesEndpoint) {
      return {
        queueId,
        messagesEndpoint: explicitMessagesEndpoint,
      };
    }

    const configuredMessagesEndpoint =
      this.resolveConfiguredMessagesEndpoint(input);
    if (configuredMessagesEndpoint) {
      return {
        queueId,
        messagesEndpoint: configuredMessagesEndpoint,
      };
    }

    return {
      queueId,
      messagesEndpoint: await this.getMessagesEndpoint(queueId),
    };
  }

  private resolveQueueId(input: QueueContextInput): string {
    const directQueueId = input.queueId?.trim();
    if (directQueueId) {
      return directQueueId;
    }

    if (!input.queueKind) {
      throw new InternalServerErrorException(
        'Queue id is required. Provide queueKind or queueId.',
      );
    }

    const envKey = OCI_QUEUE_ENV_BY_KIND[input.queueKind].queueId;
    const queueId = this.getEnv(envKey)?.trim();
    if (!queueId) {
      throw new InternalServerErrorException(
        `Queue id is required. Set ${envKey} or provide queueId.`,
      );
    }

    return queueId;
  }

  private resolveConfiguredMessagesEndpoint(input: QueueContextInput): string {
    if (!input.queueKind) {
      return '';
    }

    return this.normalizeMessagesEndpoint(
      this.getEnv(OCI_QUEUE_ENV_BY_KIND[input.queueKind].messagesEndpoint),
    );
  }

  private async getMessagesEndpoint(queueId: string): Promise<string> {
    const cachedEndpoint = this.messagesEndpointByQueueId.get(queueId);
    if (cachedEndpoint) {
      return cachedEndpoint;
    }

    if (!this.regionId) {
      throw new InternalServerErrorException(
        'Missing OCI queue configuration: OCI_REGION or messagesEndpoint.',
      );
    }

    const client = await this.getAdminClient();
    const response = await client.getQueue({ queueId });
    const messagesEndpoint = this.normalizeMessagesEndpoint(
      response.queue.messagesEndpoint,
    );

    if (!messagesEndpoint) {
      throw new InternalServerErrorException(
        `Unable to resolve messages endpoint for queue ${queueId}.`,
      );
    }

    this.messagesEndpointByQueueId.set(queueId, messagesEndpoint);
    return messagesEndpoint;
  }

  private async getAdminClient(): Promise<queue.QueueAdminClient> {
    if (this.adminClient) {
      return this.adminClient;
    }

    if (this.adminClientPromise) {
      return this.adminClientPromise;
    }

    this.adminClientPromise = this.buildAdminClient();
    try {
      this.adminClient = await this.adminClientPromise;
      return this.adminClient;
    } finally {
      this.adminClientPromise = undefined;
    }
  }

  private async buildAdminClient(): Promise<queue.QueueAdminClient> {
    const authenticationDetailsProvider =
      await this.buildAuthenticationProvider();
    const client = new queue.QueueAdminClient({
      authenticationDetailsProvider,
    });
    if (this.regionId) {
      client.regionId = this.regionId;
    }
    return client;
  }

  private async getQueueClient(
    messagesEndpoint: string,
  ): Promise<queue.QueueClient> {
    const cachedClient = this.queueClients.get(messagesEndpoint);
    if (cachedClient) {
      return cachedClient;
    }

    const pendingClient = this.queueClientPromises.get(messagesEndpoint);
    if (pendingClient) {
      return pendingClient;
    }

    const clientPromise = this.buildQueueClient(messagesEndpoint);
    this.queueClientPromises.set(messagesEndpoint, clientPromise);

    try {
      const client = await clientPromise;
      this.queueClients.set(messagesEndpoint, client);
      return client;
    } finally {
      this.queueClientPromises.delete(messagesEndpoint);
    }
  }

  private async buildQueueClient(
    messagesEndpoint: string,
  ): Promise<queue.QueueClient> {
    const authenticationDetailsProvider =
      await this.buildAuthenticationProvider();
    const client = new queue.QueueClient({
      authenticationDetailsProvider,
    });
    client.endpoint = messagesEndpoint;
    return client;
  }

  private async buildAuthenticationProvider() {
    return buildOciAuthenticationDetailsProvider(this.ociConfig, 'OCI queue');
  }

  private normalizeMessagesEndpoint(endpoint: string | undefined): string {
    return endpoint?.trim().replace(/\/+$/, '') ?? '';
  }

  private getEnv(key: string): string | undefined {
    return process.env[key];
  }

  private formatQueueFailureMessage(error: Error, queueId: string): string {
    const hints: string[] = [];

    if (this.authMode === 'instance_principal') {
      hints.push(
        'verify the app runs on an OCI compute instance',
        'verify the instance belongs to a dynamic group',
      );
    }

    if (
      error.message.includes('Authorization failed') ||
      error.message.includes('not authorized or not found')
    ) {
      hints.push(
        'verify the configured queue id points to an existing queue',
        'verify OCI_REGION matches the queue region',
        'verify the principal can access that queue',
      );
    }

    if (hints.length === 0) {
      return `OCI queue operation failed: queue=${queueId}, error=${error.message}`;
    }

    return `OCI queue operation failed: queue=${queueId}, error=${error.message}. Check: ${hints.join('; ')}.`;
  }
}
