import { DomainError, NotExistsError } from '@/core/errors';

export class EmbeddingProjectNotFoundError extends NotExistsError {
  constructor() {
    super('Project not found.', 'EMBEDDING_PROJECT_NOT_FOUND');
  }
}

export class EmbeddingWorkspaceNotFoundError extends NotExistsError {
  constructor() {
    super('Workspace not found.', 'EMBEDDING_WORKSPACE_NOT_FOUND');
  }
}

export class EmbeddingJobProjectRequiredError extends DomainError {
  constructor() {
    super(
      'Project id is required for this embedding job type.',
      'EMBEDDING_JOB_PROJECT_REQUIRED',
      400,
    );
  }
}

export class EmbeddingJobProjectNotAllowedError extends DomainError {
  constructor() {
    super(
      'Project id is not allowed for agent memory embedding jobs.',
      'EMBEDDING_JOB_PROJECT_NOT_ALLOWED',
      400,
    );
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
