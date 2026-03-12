import { DuplicateError } from '@/common/errors/domain-error';

export class EmailAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Email already exists.', 'Email_ALREADY_EXISTS');
  }
}
