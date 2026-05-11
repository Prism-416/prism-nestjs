const OBJECT_NAME_SAFE_CHARACTER = /[^a-zA-Z0-9._-]/g;

export function sanitizeDocumentFileName(fileName: string): string {
  const lastPathSegment = fileName.split(/[\\/]/).pop() ?? 'document';
  const sanitized = lastPathSegment
    .trim()
    .replace(OBJECT_NAME_SAFE_CHARACTER, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);

  return sanitized || 'document';
}

export function buildDocumentObjectName(params: {
  projectId: string;
  documentId: string;
  fileName: string;
}): string {
  return [
    'projects',
    params.projectId,
    'documents',
    `${params.documentId}-${sanitizeDocumentFileName(params.fileName)}`,
  ].join('/');
}
