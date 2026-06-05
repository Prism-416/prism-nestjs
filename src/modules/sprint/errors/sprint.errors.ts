import { DomainError, DuplicateError, NotExistsError } from '@/core/errors';
import { QueryFailedError } from 'typeorm';

const SPRINT_NAME_UNIQUE_CONSTRAINT = 'uq_sprints_workspace_name';
const SPRINT_PERIOD_CHECK_CONSTRAINT = 'ck_sprints_period';
const SPRINT_WORK_ITEM_MAP_PK_CONSTRAINT = 'prism_sprint_work_item_map_pkey';

export class SprintWorkspaceNotFoundError extends NotExistsError {
  constructor() {
    super('Workspace not found.', 'WORKSPACE_NOT_FOUND');
  }
}

export class SprintWorkspacePermissionRequiredError extends DomainError {
  constructor() {
    super(
      'Workspace admin permission is required.',
      'WORKSPACE_ADMIN_PERMISSION_REQUIRED',
      403,
    );
  }
}

export class SprintAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Sprint already exists.', 'SPRINT_ALREADY_EXISTS');
  }
}

export class SprintNotFoundError extends NotExistsError {
  constructor() {
    super('Sprint not found.', 'SPRINT_NOT_FOUND');
  }
}

export class SprintPeriodInvalidError extends DomainError {
  constructor() {
    super('Sprint period is invalid.', 'SPRINT_PERIOD_INVALID', 400);
  }
}

export class SprintWorkItemNotFoundError extends NotExistsError {
  constructor() {
    super('Work item not found in sprint.', 'SPRINT_WORK_ITEM_NOT_FOUND');
  }
}

export class SprintWorkItemAlreadyAddedError extends DuplicateError {
  constructor() {
    super(
      'One or more work items are already in the sprint.',
      'SPRINT_WORK_ITEM_ALREADY_ADDED',
    );
  }
}

export function isSprintNameUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;

  return (
    driverError?.code === '23505' &&
    driverError.constraint === SPRINT_NAME_UNIQUE_CONSTRAINT
  );
}

export function isSprintPeriodCheckViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;

  return (
    driverError?.code === '23514' &&
    driverError.constraint === SPRINT_PERIOD_CHECK_CONSTRAINT
  );
}

export function isSprintWorkItemMapDuplicateViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;

  return (
    driverError?.code === '23505' &&
    driverError.constraint === SPRINT_WORK_ITEM_MAP_PK_CONSTRAINT
  );
}
