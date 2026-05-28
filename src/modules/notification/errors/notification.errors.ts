import { NotExistsError } from '@/core/errors';

export class NotificationNotFoundError extends NotExistsError {
  constructor() {
    super('Notification not found.', 'NOTIFICATION_NOT_FOUND');
  }
}
