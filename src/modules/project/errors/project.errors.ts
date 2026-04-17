import { DuplicateError } from '@/core/errors';
import { QueryFailedError } from 'typeorm';

const PROJECT_SLUG_UNIQUE_CONSTRAINT = 'uq_projects_workspace_slug';

export class ProjectSlugAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Project slug already exists.', 'PROJECT_SLUG_ALREADY_EXISTS');
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
    driverError.constraint === PROJECT_SLUG_UNIQUE_CONSTRAINT
  );
}
