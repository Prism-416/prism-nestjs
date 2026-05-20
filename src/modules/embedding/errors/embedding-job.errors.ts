import { DomainError, NotExistsError } from '@/core/errors';

export class EmbeddingProjectNotFoundError extends NotExistsError {
  constructor() {
    super('Project not found.', 'EMBEDDING_PROJECT_NOT_FOUND');
  }
}

export class EmbeddingJobTargetNotFoundError extends NotExistsError {
  constructor() {
    super('Embedding job target not found.', 'EMBEDDING_JOB_TARGET_NOT_FOUND');
  }
}

export class EmbeddingJobNotFoundError extends NotExistsError {
  constructor() {
    super('Embedding job not found.', 'EMBEDDING_JOB_NOT_FOUND');
  }
}

export class EmbeddingJobRequeueScheduledAtRequiredError extends DomainError {
  constructor() {
    super(
      'Scheduled time is required when re-queueing an embedding job.',
      'EMBEDDING_JOB_REQUEUE_SCHEDULED_AT_REQUIRED',
      400,
    );
  }
}
