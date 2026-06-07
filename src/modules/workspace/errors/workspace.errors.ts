import { DomainError, DuplicateError, NotExistsError } from '@/core/errors';
import { QueryFailedError } from 'typeorm';

const WORKSPACE_SLUG_UNIQUE_CONSTRAINT = 'uq_workspaces_slug';
const WORKSPACE_JOB_NAME_UNIQUE_CONSTRAINT = 'uq_jobs_workspace_name';

export class WorkspaceSlugAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Workspace slug already exists.', 'WORKSPACE_SLUG_ALREADY_EXISTS');
  }
}

export class WorkspaceNameAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Workspace name already exists.', 'WORKSPACE_NAME_ALREADY_EXISTS');
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

export class WorkspaceMemberNotFoundError extends NotExistsError {
  constructor() {
    super('Workspace member not found.', 'WORKSPACE_MEMBER_NOT_FOUND');
  }
}

export class WorkspaceOwnerRemovalError extends DomainError {
  constructor() {
    super('Workspace owner cannot be removed.', 'WORKSPACE_OWNER_REMOVAL', 400);
  }
}

export class WorkspaceOwnerRoleUpdateError extends DomainError {
  constructor() {
    super(
      'Workspace owner role cannot be changed.',
      'WORKSPACE_OWNER_ROLE_UPDATE',
      400,
    );
  }
}

export class WorkspaceOwnerRequiredError extends DomainError {
  constructor() {
    super(
      'Workspace owner permission is required.',
      'WORKSPACE_OWNER_REQUIRED',
      403,
    );
  }
}

export class WorkspaceInvitationNotFoundError extends NotExistsError {
  constructor() {
    super('Workspace invitation not found.', 'WORKSPACE_INVITATION_NOT_FOUND');
  }
}

export class WorkspaceInvitationExpiredError extends DomainError {
  constructor() {
    super(
      'Workspace invitation has expired.',
      'WORKSPACE_INVITATION_EXPIRED',
      400,
    );
  }
}

export class WorkspaceInvitationAlreadyAcceptedError extends DomainError {
  constructor() {
    super(
      'Workspace invitation has already been accepted.',
      'WORKSPACE_INVITATION_ALREADY_ACCEPTED',
      400,
    );
  }
}

export class WorkspaceInvitationAlreadyDeclinedError extends DomainError {
  constructor() {
    super(
      'Workspace invitation has already been declined.',
      'WORKSPACE_INVITATION_ALREADY_DECLINED',
      400,
    );
  }
}

export class WorkspaceInvitationCancelledError extends DomainError {
  constructor() {
    super(
      'Workspace invitation has been cancelled.',
      'WORKSPACE_INVITATION_CANCELLED',
      400,
    );
  }
}

export class WorkspaceInvitationRecipientRequiredError extends DomainError {
  constructor() {
    super(
      'Workspace invitation requires a receiver id or email.',
      'WORKSPACE_INVITATION_RECIPIENT_REQUIRED',
      400,
    );
  }
}

export class WorkspaceInvitationSignupRequiredError extends DomainError {
  constructor() {
    super(
      'Workspace invitation recipient must sign up before accepting.',
      'WORKSPACE_INVITATION_SIGNUP_REQUIRED',
      409,
    );
  }
}

export class WorkspaceJobAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Workspace job already exists.', 'WORKSPACE_JOB_ALREADY_EXISTS');
  }
}

export class WorkspaceJobNotFoundError extends NotExistsError {
  constructor() {
    super('Workspace job not found.', 'WORKSPACE_JOB_NOT_FOUND');
  }
}

export class WorkspaceRepositoryLinkNotFoundError extends NotExistsError {
  constructor() {
    super(
      'Workspace repository link not found.',
      'WORKSPACE_REPOSITORY_LINK_NOT_FOUND',
    );
  }
}

export class FeatureProvisioningProjectNotFoundError extends NotExistsError {
  constructor() {
    super('Project not found.', 'FEATURE_PROVISIONING_PROJECT_NOT_FOUND');
  }
}

export class FeatureProvisioningRequestNotFoundError extends NotExistsError {
  constructor() {
    super(
      'Feature provisioning request not found.',
      'FEATURE_PROVISIONING_REQUEST_NOT_FOUND',
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

export function isWorkspaceJobNameUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;

  return (
    driverError?.code === '23505' &&
    driverError.constraint === WORKSPACE_JOB_NAME_UNIQUE_CONSTRAINT
  );
}
