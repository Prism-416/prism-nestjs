export type SendEmailAddress = {
  email: string;
  name?: string;
};

export type SendEmailInput = {
  to: SendEmailAddress[];
  cc?: SendEmailAddress[];
  bcc?: SendEmailAddress[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  replyTo?: SendEmailAddress[];
  headers?: Record<string, string>;
  messageId?: string;
  senderEmail?: string;
  senderName?: string;
};

export type SendEmailResult = {
  messageId: string;
  envelopeId: string;
  suppressedRecipients: SendEmailAddress[];
};
