import { DuplicateError } from '@/common/errors/domain-error';
import { UnauthorizedDomainError } from '@/common/errors/domain-error';

export class EmailAlreadyExistsError extends DuplicateError {
  constructor() {
    super('Email already exists.', 'EMAIL_ALREADY_EXISTS');
  }
}

export class InvalidCredentialsError extends UnauthorizedDomainError {
  constructor() {
    super('Invalid email or password.', 'INVALID_CREDENTIALS');
  }
}

export class InvalidRefreshTokenError extends UnauthorizedDomainError {
  constructor() {
    super('Invalid refresh token.', 'INVALID_REFRESH_TOKEN');
  }
}

export class InvalidGoogleIdTokenError extends UnauthorizedDomainError {
  constructor() {
    super('Invalid Google ID token.', 'INVALID_GOOGLE_ID_TOKEN');
  }
}

export class UnverifiedGoogleEmailError extends UnauthorizedDomainError {
  constructor() {
    super('Google account email is not verified.', 'UNVERIFIED_GOOGLE_EMAIL');
  }
}
