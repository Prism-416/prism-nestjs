import { DuplicateError, NotExistsError } from '@/core/errors';
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

export class ProjectMemberWorkspaceMemberNotFoundError extends NotExistsError {
  constructor() {
    super(
      'Workspace member not found.',
      'PROJECT_MEMBER_WORKSPACE_MEMBER_NOT_FOUND',
    );
  }
}

export class ProjectMemberNotFoundError extends NotExistsError {
  constructor() {
    super('Project member not found.', 'PROJECT_MEMBER_NOT_FOUND');
  }
}

export class ProjectJobNotFoundError extends NotExistsError {
  constructor() {
    super('Project job not found.', 'PROJECT_JOB_NOT_FOUND');
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
