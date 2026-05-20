import { DomainError, NotExistsError } from '@/core/errors';

export class DocumentProjectNotFoundError extends NotExistsError {
  constructor() {
    super('Project not found.', 'PROJECT_NOT_FOUND');
  }
}

export class DocumentNotFoundError extends NotExistsError {
  constructor() {
    super('Document not found.', 'DOCUMENT_NOT_FOUND');
  }
}

export class DocumentFileRequiredError extends DomainError {
  constructor() {
    super('Document file is required.', 'DOCUMENT_FILE_REQUIRED', 400);
  }
}

export class DocumentFileEmptyError extends DomainError {
  constructor() {
    super('Document file is empty.', 'DOCUMENT_FILE_EMPTY', 400);
  }
}

export class DocumentChunkDuplicateIndexError extends DomainError {
  constructor() {
    super(
      'Document chunk indexes must be unique.',
      'DOCUMENT_CHUNK_DUPLICATE_INDEX',
      400,
    );
  }
}

export class DocumentChunkDuplicateContentHashError extends DomainError {
  constructor() {
    super(
      'Document chunk content hashes must be unique.',
      'DOCUMENT_CHUNK_DUPLICATE_CONTENT_HASH',
      400,
    );
  }
}

export class DocumentChunkContentHashConflictError extends DomainError {
  constructor() {
    super(
      'Document chunk content hash already exists for another chunk.',
      'DOCUMENT_CHUNK_CONTENT_HASH_CONFLICT',
      409,
    );
  }
}
