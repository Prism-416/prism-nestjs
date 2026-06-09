import type { OciQueueKind } from '@/core/queue/oci-queue.constants';

export type OciQueueMessageMetadata = {
  channelId: string;
  customProperties?: Record<string, string>;
};

type OciQueueLocation = {
  queueId?: string;
  messagesEndpoint?: string;
  queueKind?: OciQueueKind;
};

export type OciQueueMessageInput = {
  content: string;
  metadata?: OciQueueMessageMetadata;
};

export type PublishQueueMessagesInput = OciQueueLocation & {
  messages: OciQueueMessageInput[];
  opcRequestId?: string;
};

export type PublishedQueueMessage = {
  id: number;
  expireAfter?: Date;
};

export type PublishQueueMessagesResult = {
  messages: PublishedQueueMessage[];
  opcRequestId: string;
};

export type ConsumeQueueMessagesInput = OciQueueLocation & {
  visibilityInSeconds?: number;
  timeoutInSeconds?: number;
  limit?: number;
  channelFilter?: string;
  consumerGroupId?: string;
  opcRequestId?: string;
};

export type ConsumedQueueMessage = {
  id: number;
  content: string;
  receipt: string;
  deliveryCount: number;
  visibleAfter: Date;
  expireAfter: Date;
  createdAt: Date;
  metadata?: OciQueueMessageMetadata;
};

export type DeleteQueueMessageInput = OciQueueLocation & {
  receipt: string;
  consumerGroupId?: string;
  opcRequestId?: string;
};

export type UpdateQueueMessageVisibilityInput = OciQueueLocation & {
  receipt: string;
  visibilityInSeconds: number;
  consumerGroupId?: string;
  opcRequestId?: string;
};
