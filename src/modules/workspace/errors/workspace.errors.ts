import { DuplicateError, NotExistsError } from '@/common/errors';
import { QueryFailedError } from 'typeorm';

const WORKSPACE_SLUG_UNIQUE_CONSTRAINT = 'uq_workspaces_slug';

export class WorkspaceSlugAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Workspace slug already exists.', 'WORKSPACE_SLUG_ALREADY_EXISTS');
  }
}

export class WorkspaceNotFoundError extends NotExistsError {
  constructor() {
    super('Workspace not found.', 'WORKSPACE_NOT_FOUND');
  }
}

export class WorkspaceMemberUserNotFoundError extends NotExistsError {
  constructor() {
    super('User not found.', 'WORKSPACE_MEMBER_USER_NOT_FOUND');
  }
}

export class WorkspaceMemberAlreadyExistsError extends DuplicateError {
  constructor() {
    super(
      'User is already a workspace member.',
      'WORKSPACE_MEMBER_ALREADY_EXISTS',
    );
  }
}

export function isWorkspaceSlugUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;

  return (
    driverError?.code === '23505' &&
    driverError.constraint === WORKSPACE_SLUG_UNIQUE_CONSTRAINT
  );
}
