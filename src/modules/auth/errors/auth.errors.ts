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

export class EmailNotVerifiedError extends UnauthorizedDomainError {
  constructor() {
    super('Email is not verified.', 'EMAIL_NOT_VERIFIED');
  }
}

export class InvalidEmailVerificationTokenError extends UnauthorizedDomainError {
  constructor() {
    super(
      'Invalid or expired email verification token.',
      'INVALID_EMAIL_VERIFICATION_TOKEN',
    );
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

export class InvalidGithubAuthorizationCodeError extends UnauthorizedDomainError {
  constructor() {
    super(
      'Invalid GitHub authorization code.',
      'INVALID_GITHUB_AUTHORIZATION_CODE',
    );
  }
}

export class UnverifiedGithubEmailError extends UnauthorizedDomainError {
  constructor() {
    super('GitHub account email is not verified.', 'UNVERIFIED_GITHUB_EMAIL');
  }
}
