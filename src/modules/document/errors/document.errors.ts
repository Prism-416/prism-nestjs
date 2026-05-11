import { NotExistsError } from '@/core/errors';

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
