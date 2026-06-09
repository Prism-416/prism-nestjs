import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OciObjectStorageService } from '@/core/object-storage';
import { OciQueueService } from '@/core/queue';
import type {
  FeatureProvisioningPayload,
  FeatureProvisioningRequestedEvent,
} from '@/modules/workspace/types';

const FEATURE_PROVISIONING_QUEUE_CHANNEL = 'feature-provisioning';
const FEATURE_PROVISIONING_EVENT_TYPE = 'feature.provisioning.requested';
const FEATURE_PROVISIONING_STDOUT_QUEUE_MESSAGE_ID_PREFIX = 'stdout';

@Injectable()
export class FeatureProvisioningDispatchService {
  constructor(
    private readonly objectStorage: OciObjectStorageService,
    private readonly queue: OciQueueService,
    private readonly configService: ConfigService,
  ) {}

  buildPayloadObjectName(workspaceId: string, requestId: string): string {
    return [
      'workspaces',
      workspaceId,
      'feature-provisioning',
      `${requestId}.json`,
    ].join('/');
  }

  async uploadPayload(params: {
    objectName: string;
    payload: FeatureProvisioningPayload;
  }): Promise<{ payloadVersionId: string | null }> {
    const result = await this.objectStorage.putObject({
      bucketKind: 'agentPayload',
      objectName: params.objectName,
      body: JSON.stringify(params.payload),
      contentType: 'application/json',
      metadata: {
        schemaVersion: params.payload.schemaVersion,
        requestId: params.payload.requestId,
        workspaceId: params.payload.workspaceId,
        projectId: params.payload.projectId,
      },
    });

    return {
      payloadVersionId: result.versionId || null,
    };
  }

  async publishRequestedEvent(
    event: FeatureProvisioningRequestedEvent,
  ): Promise<{ queueMessageId: string }> {
    if (this.isStdoutDispatchMode()) {
      this.writeStdoutPayload('feature-provisioning.event', event);

      return {
        queueMessageId: `${FEATURE_PROVISIONING_STDOUT_QUEUE_MESSAGE_ID_PREFIX}:${event.requestId}`,
      };
    }

    const result = await this.queue.publishMessages({
      queueKind: 'agentEvents',
      messages: [
        {
          content: JSON.stringify(event),
          metadata: {
            channelId: FEATURE_PROVISIONING_QUEUE_CHANNEL,
            customProperties: {
              eventType: event.type,
              requestId: event.requestId,
              workspaceId: event.workspaceId,
              projectId: event.projectId,
            },
          },
        },
      ],
    });

    const message = result.messages[0];
    if (!message) {
      throw new InternalServerErrorException(
        'Failed to publish queue message.',
      );
    }

    return {
      queueMessageId: String(message.id),
    };
  }

  buildRequestedEvent(params: {
    requestId: string;
    payloadObjectName: string;
    payloadVersionId: string | null;
    workspaceId: string;
    projectId: string;
    requestedByUserId: string;
    requestedAt: string;
  }): FeatureProvisioningRequestedEvent {
    return {
      type: FEATURE_PROVISIONING_EVENT_TYPE,
      version: '1.0',
      requestId: params.requestId,
      payloadId: params.requestId,
      payloadObjectName: params.payloadObjectName,
      payloadVersionId: params.payloadVersionId,
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      requestedByUserId: params.requestedByUserId,
      requestedAt: params.requestedAt,
    };
  }

  private isStdoutDispatchMode(): boolean {
    return (
      (
        this.configService.get<string>('FEATURE_PROVISIONING_DISPATCH_MODE') ??
        'oci'
      )
        .trim()
        .toLowerCase() === 'stdout'
    );
  }

  private writeStdoutPayload(label: string, payload: unknown): void {
    process.stdout.write(`${label} ${JSON.stringify(payload, null, 2)}\n`);
  }
}
