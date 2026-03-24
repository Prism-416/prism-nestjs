import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as common from 'oci-common';
import * as emailDataPlane from 'oci-emaildataplane';
import {
  SendEmailAddress,
  SendEmailInput,
  SendEmailResult,
} from '@/common/email/oci-email.types';

@Injectable()
export class OciEmailDeliveryService {
  private readonly logger = new Logger(OciEmailDeliveryService.name);
  private readonly enabled =
    (this.getEnv('EMAIL_ENABLED') ?? 'false').toLowerCase() === 'true';
  private readonly authMode = (this.getEnv('OCI_AUTH_MODE') ?? 'api_key')
    .toLowerCase()
    .trim();
  private readonly regionId = this.getEnv('OCI_REGION') ?? '';
  private readonly tenancyOcid = this.getEnv('OCI_TENANCY_OCID') ?? '';
  private readonly userOcid = this.getEnv('OCI_USER_OCID') ?? '';
  private readonly fingerprint = this.getEnv('OCI_FINGERPRINT') ?? '';
  private readonly privateKey =
    this.getEnv('OCI_PRIVATE_KEY')?.replace(/\\n/g, '\n') ?? '';
  private readonly compartmentId = this.getEnv('OCI_COMPARTMENT_ID') ?? '';
  private readonly senderEmail = this.getEnv('EMAIL_SENDER_EMAIL') ?? '';
  private readonly senderName = this.getEnv('EMAIL_SENDER_NAME') ?? undefined;

  private client?: emailDataPlane.EmailDPClient;
  private clientPromise?: Promise<emailDataPlane.EmailDPClient>;

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Email delivery is disabled. Set EMAIL_ENABLED=true.',
      );
    }

    if (!input.bodyHtml && !input.bodyText) {
      throw new InternalServerErrorException(
        'Email body is required. Provide bodyHtml or bodyText.',
      );
    }

    const recipients = {
      to: this.mapAddresses(input.to),
      cc: this.mapAddresses(input.cc),
      bcc: this.mapAddresses(input.bcc),
    };

    if (
      recipients.to.length === 0 &&
      recipients.cc.length === 0 &&
      recipients.bcc.length === 0
    ) {
      throw new InternalServerErrorException(
        'At least one recipient is required.',
      );
    }

    const senderAddress = {
      email: input.senderEmail ?? this.senderEmail,
      name: input.senderName ?? this.senderName,
    };

    if (!senderAddress.email) {
      throw new InternalServerErrorException(
        'Sender email is required. Set EMAIL_SENDER_EMAIL or provide senderEmail.',
      );
    }
    if (!this.compartmentId) {
      throw new InternalServerErrorException(
        'Missing OCI email configuration: OCI_COMPARTMENT_ID',
      );
    }

    const client = await this.getClient();

    try {
      const response = await client.submitEmail({
        submitEmailDetails: {
          messageId: input.messageId,
          sender: {
            senderAddress,
            compartmentId: this.compartmentId,
          },
          recipients,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          replyTo: this.mapAddresses(input.replyTo),
          headerFields: input.headers,
        },
      });

      return {
        messageId: response.emailSubmittedResponse.messageId,
        envelopeId: response.emailSubmittedResponse.envelopeId,
        suppressedRecipients:
          response.emailSubmittedResponse.suppressedRecipients,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`OCI email submission failed: ${err.message}`);
      throw new InternalServerErrorException('Failed to send email.');
    }
  }

  private mapAddresses(
    addresses: SendEmailAddress[] | undefined,
  ): SendEmailAddress[] {
    if (!addresses || addresses.length === 0) {
      return [];
    }
    return addresses.filter((address) => address.email);
  }

  private async getClient(): Promise<emailDataPlane.EmailDPClient> {
    if (this.client) {
      return this.client;
    }

    if (this.clientPromise) {
      return this.clientPromise;
    }

    this.clientPromise = this.buildClient();
    try {
      this.client = await this.clientPromise;
      return this.client;
    } finally {
      this.clientPromise = undefined;
    }
  }

  private async buildClient(): Promise<emailDataPlane.EmailDPClient> {
    const authenticationDetailsProvider =
      await this.buildAuthenticationProvider();

    const client = new emailDataPlane.EmailDPClient({
      authenticationDetailsProvider,
    });
    if (this.regionId) {
      client.regionId = this.regionId;
    }
    return client;
  }

  private async buildAuthenticationProvider(): Promise<common.AuthenticationDetailsProvider> {
    if (this.authMode === 'instance_principal') {
      return new common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
    }

    if (this.authMode === 'resource_principal') {
      return common.ResourcePrincipalAuthenticationDetailsProvider.builder();
    }

    if (this.authMode !== 'api_key') {
      throw new InternalServerErrorException(
        `Unsupported OCI_AUTH_MODE: ${this.authMode}.`,
      );
    }

    this.ensureRequiredApiKeyConfiguration();
    return new common.SimpleAuthenticationDetailsProvider(
      this.tenancyOcid,
      this.userOcid,
      this.fingerprint,
      this.privateKey,
      null,
    );
  }

  private ensureRequiredApiKeyConfiguration(): void {
    const missingKeys = [
      ['OCI_REGION', this.regionId],
      ['OCI_TENANCY_OCID', this.tenancyOcid],
      ['OCI_USER_OCID', this.userOcid],
      ['OCI_FINGERPRINT', this.fingerprint],
      ['OCI_PRIVATE_KEY', this.privateKey],
    ]
      .filter((entry) => !entry[1])
      .map((entry) => entry[0]);

    if (missingKeys.length > 0) {
      throw new InternalServerErrorException(
        `Missing OCI email configuration: ${missingKeys.join(', ')}`,
      );
    }
  }

  private getEnv(key: string): string | undefined {
    return process.env[key];
  }
}
