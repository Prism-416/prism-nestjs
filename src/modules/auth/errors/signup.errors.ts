import { DuplicateError } from '@/core/errors/domain-error';

export class UsernameAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Username already exists', 'USERNAME_ALREADY_EXISTS');
  }
}
