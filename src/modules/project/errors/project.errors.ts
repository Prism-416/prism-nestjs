import { DomainError, DuplicateError, NotExistsError } from '@/core/errors';
import { QueryFailedError } from 'typeorm';

const PROJECT_SLUG_UNIQUE_CONSTRAINTS = new Set([
  'uq_projects_slug',
  'uq_projects_workspace_slug',
]);

export class ProjectSlugAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Project slug already exists.', 'PROJECT_SLUG_ALREADY_EXISTS');
  }
}

export class ProjectNotFoundError extends NotExistsError {
  constructor() {
    super('Project not found.', 'PROJECT_NOT_FOUND');
  }
}

export class ProjectRepositoryLinkNotFoundError extends NotExistsError {
  constructor() {
    super(
      'Project repository link not found.',
      'PROJECT_REPOSITORY_LINK_NOT_FOUND',
    );
  }
}

export class PullRequestNotFoundError extends NotExistsError {
  constructor() {
    super('Pull request not found.', 'PULL_REQUEST_NOT_FOUND');
  }
}

export class PullRequestHeadStaleError extends DomainError {
  constructor() {
    super(
      'Pull request head SHA no longer matches the submitted review.',
      'PULL_REQUEST_HEAD_STALE',
      409,
    );
  }
}

export class PullRequestReviewCommentAnchorInvalidError extends DomainError {
  constructor() {
    super(
      'Pull request review comment anchor is invalid for the current diff.',
      'PULL_REQUEST_REVIEW_COMMENT_ANCHOR_INVALID',
      422,
    );
  }
}

export function isProjectSlugUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;

  return (
    driverError?.code === '23505' &&
    typeof driverError.constraint === 'string' &&
    PROJECT_SLUG_UNIQUE_CONSTRAINTS.has(driverError.constraint)
  );
}
