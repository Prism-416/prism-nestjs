export type OciQueueMessageMetadata = {
  channelId: string;
  customProperties?: Record<string, string>;
};

export type OciQueueMessageInput = {
  content: string;
  metadata?: OciQueueMessageMetadata;
};

export type PublishQueueMessagesInput = {
  messages: OciQueueMessageInput[];
  queueId?: string;
  messagesEndpoint?: string;
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

export type ConsumeQueueMessagesInput = {
  queueId?: string;
  messagesEndpoint?: string;
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

export type DeleteQueueMessageInput = {
  receipt: string;
  queueId?: string;
  messagesEndpoint?: string;
  consumerGroupId?: string;
  opcRequestId?: string;
};

export type UpdateQueueMessageVisibilityInput = {
  receipt: string;
  visibilityInSeconds: number;
  queueId?: string;
  messagesEndpoint?: string;
  consumerGroupId?: string;
  opcRequestId?: string;
};
