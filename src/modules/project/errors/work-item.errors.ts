import { DomainError, NotExistsError } from '@/core/errors';
import { QueryFailedError } from 'typeorm';

const WORK_ITEM_PARENT_FOREIGN_KEY = 'fk_work_items_parent';

export class WorkItemParentNotFoundError extends NotExistsError {
  constructor() {
    super('Work item parent not found.', 'WORK_ITEM_PARENT_NOT_FOUND');
  }
}

export class WorkItemNotFoundError extends NotExistsError {
  constructor() {
    super('Work item not found.', 'WORK_ITEM_NOT_FOUND');
  }
}

export class WorkItemAssigneeNotFoundError extends NotExistsError {
  constructor() {
    super('Work item assignee not found.', 'WORK_ITEM_ASSIGNEE_NOT_FOUND');
  }
}

export class WorkItemParentInvalidError extends NotExistsError {
  constructor() {
    super('Work item parent is invalid.', 'WORK_ITEM_PARENT_INVALID');
  }
}

export class WorkItemScheduleInvalidError extends DomainError {
  constructor() {
    super(
      'Work item due date must be on or after its start date.',
      'WORK_ITEM_SCHEDULE_INVALID',
      400,
    );
  }
}

export class WorkItemEmbeddingTargetMismatchError extends DomainError {
  constructor() {
    super(
      'Work item embedding target no longer matches the current work item.',
      'WORK_ITEM_EMBEDDING_TARGET_MISMATCH',
      409,
    );
  }
}

export function isWorkItemParentForeignKeyViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;

  return (
    driverError?.code === '23503' &&
    driverError.constraint === WORK_ITEM_PARENT_FOREIGN_KEY
  );
}
