export const OCI_OBJECT_STORAGE_BUCKET_ENV_BY_KIND = {
  agentPayload: 'OCI_OBJECT_STORAGE_AGENT_PAYLOAD_BUCKET',
  documents: 'OCI_OBJECT_STORAGE_DOCUMENTS_BUCKET',
} as const;

export type OciObjectStorageBucketKind =
  keyof typeof OCI_OBJECT_STORAGE_BUCKET_ENV_BY_KIND;
