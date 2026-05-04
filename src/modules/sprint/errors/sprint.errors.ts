import { DomainError, DuplicateError, NotExistsError } from '@/core/errors';
import { QueryFailedError } from 'typeorm';

const SPRINT_NAME_UNIQUE_CONSTRAINT = 'uq_sprints_project_name';
const SPRINT_PERIOD_CHECK_CONSTRAINT = 'ck_sprints_period';

export class SprintProjectNotFoundError extends NotExistsError {
  constructor() {
    super('Project not found.', 'PROJECT_NOT_FOUND');
  }
}

export class SprintAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Sprint already exists.', 'SPRINT_ALREADY_EXISTS');
  }
}

export class SprintPeriodInvalidError extends DomainError {
  constructor() {
    super('Sprint period is invalid.', 'SPRINT_PERIOD_INVALID', 400);
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
