import { NotExistsError } from '@/core/errors';
import { QueryFailedError } from 'typeorm';

const WORK_ITEM_PARENT_FOREIGN_KEY = 'fk_work_items_parent';

export class WorkItemParentNotFoundError extends NotExistsError {
  constructor() {
    super('Work item parent not found.', 'WORK_ITEM_PARENT_NOT_FOUND');
  }
}

export class WorkItemAssigneeNotFoundError extends NotExistsError {
  constructor() {
    super(
      'Work item assignee project member not found.',
      'WORK_ITEM_ASSIGNEE_NOT_FOUND',
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
