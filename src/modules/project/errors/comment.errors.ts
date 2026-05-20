import { DomainError, NotExistsError } from '@/core/errors';

export class CommentNotFoundError extends NotExistsError {
  constructor() {
    super('Comment not found.', 'COMMENT_NOT_FOUND');
  }
}

export class CommentEmbeddingTargetMismatchError extends DomainError {
  constructor() {
    super(
      'Comment embedding target no longer matches the current comment.',
      'COMMENT_EMBEDDING_TARGET_MISMATCH',
      409,
    );
  }
}
