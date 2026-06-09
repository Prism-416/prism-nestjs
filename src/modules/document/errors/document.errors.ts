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

export class DocumentWorkItemNotFoundError extends NotExistsError {
  constructor() {
    super('Work item not found.', 'WORK_ITEM_NOT_FOUND');
  }
}

export class DocumentCommentNotFoundError extends NotExistsError {
  constructor() {
    super('Comment not found.', 'COMMENT_NOT_FOUND');
  }
}

export class DocumentCommentWorkItemRequiredError extends DomainError {
  constructor() {
    super(
      'workItemId is required when attaching a document to a comment.',
      'DOCUMENT_COMMENT_WORK_ITEM_REQUIRED',
      400,
    );
  }
}

export class DocumentForbiddenError extends DomainError {
  constructor() {
    super(
      'You do not have permission to perform this action on this document.',
      'DOCUMENT_FORBIDDEN',
      403,
    );
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

export class DocumentAttachmentUploadFailedError extends DomainError {
  constructor() {
    super(
      'Comment attachment could not be uploaded.',
      'DOCUMENT_ATTACHMENT_UPLOAD_FAILED',
      500,
    );
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

export class DocumentChunkEmbeddingDuplicateTargetError extends DomainError {
  constructor() {
    super(
      'Document chunk embedding targets must be unique.',
      'DOCUMENT_CHUNK_EMBEDDING_DUPLICATE_TARGET',
      400,
    );
  }
}

export class DocumentChunkEmbeddingTargetMismatchError extends DomainError {
  constructor() {
    super(
      'One or more document chunks were not found or content hashes do not match.',
      'DOCUMENT_CHUNK_EMBEDDING_TARGET_MISMATCH',
      409,
    );
  }
}
