import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as emailDataPlane from 'oci-emaildataplane';
import {
  buildOciAuthenticationDetailsProvider,
  readOciAuthenticationConfig,
} from '@/core/oci';
import {
  SendEmailAddress,
  SendEmailInput,
  SendEmailResult,
} from '@/core/email/oci-email.types';

@Injectable()
export class OciEmailDeliveryService {
  private readonly logger = new Logger(OciEmailDeliveryService.name);
  private readonly enabled =
    (this.getEnv('EMAIL_ENABLED') ?? 'false').toLowerCase() === 'true';
  private readonly ociConfig = readOciAuthenticationConfig((key) =>
    this.getEnv(key),
  );
  private readonly authMode = this.ociConfig.authMode;
  private readonly regionId = this.ociConfig.regionId;
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

    try {
      const client = await this.getClient();
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
      this.logger.error(this.formatEmailFailureMessage(err));
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

  private async buildAuthenticationProvider() {
    return buildOciAuthenticationDetailsProvider(this.ociConfig, 'OCI email');
  }

  private getEnv(key: string): string | undefined {
    return process.env[key];
  }

  private formatEmailFailureMessage(error: Error): string {
    const hints: string[] = [];

    if (this.authMode === 'instance_principal') {
      hints.push(
        'verify the app runs on an OCI compute instance',
        'verify the instance belongs to a dynamic group',
        'verify that dynamic group can `use email-family` in the sender compartment',
        'verify the runtime can reach OCI instance metadata at http://169.254.169.254/opc/v2/',
      );
    }

    if (
      error.message.includes('Authorization failed') ||
      error.message.includes('not authorized or not found')
    ) {
      hints.push(
        'verify EMAIL_SENDER_EMAIL matches an approved sender exactly',
        'verify OCI_COMPARTMENT_ID is the compartment that contains that approved sender',
        'verify the approved sender exists in the same OCI region as the request',
      );
    }

    if (hints.length === 0) {
      return `OCI email submission failed: ${error.message}`;
    }

    return `OCI email submission failed: ${error.message}. Check: ${hints.join('; ')}.`;
  }
}
