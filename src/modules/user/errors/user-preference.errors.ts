import { NotExistsError } from '@/core/errors/domain-error';

export class UserPreferencesNotFoundError extends NotExistsError {
  constructor() {
    super('User preferences not found.', 'USER_PREFERENCES_NOT_FOUND');
  }
}
