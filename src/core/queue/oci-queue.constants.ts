export const OCI_QUEUE_ENV_BY_KIND = {
  agentEvents: {
    queueId: 'OCI_QUEUE_AGENT_EVENTS_QUEUE_ID',
    messagesEndpoint: 'OCI_QUEUE_AGENT_EVENTS_MESSAGES_ENDPOINT',
  },
} as const;

export type OciQueueKind = keyof typeof OCI_QUEUE_ENV_BY_KIND;
