import { NotExistsError } from '@/core/errors';

export class CommentNotFoundError extends NotExistsError {
  constructor() {
    super('Comment not found.', 'COMMENT_NOT_FOUND');
  }
}
