import { DomainError, DuplicateError, NotExistsError } from '@/core/errors';
import { QueryFailedError } from 'typeorm';

const SERVICE_ACCOUNT_NAME_UNIQUE_CONSTRAINT = 'uq_service_accounts_name';
const SERVICE_API_TOKEN_PREFIX_UNIQUE_CONSTRAINT =
  'uq_service_api_tokens_prefix';

export class InternalServiceAccountAlreadyExistsError extends DuplicateError {
  constructor() {
    super(
      'Internal service account already exists.',
      'INTERNAL_SERVICE_ACCOUNT_ALREADY_EXISTS',
    );
  }
}

export class InternalServiceAccountNotFoundError extends NotExistsError {
  constructor() {
    super(
      'Internal service account not found.',
      'INTERNAL_SERVICE_ACCOUNT_NOT_FOUND',
    );
  }
}

export class InternalServiceAccountInactiveError extends DomainError {
  constructor() {
    super(
      'Internal service account is inactive.',
      'INTERNAL_SERVICE_ACCOUNT_INACTIVE',
      401,
    );
  }
}

export class InternalApiTokenNotFoundError extends NotExistsError {
  constructor() {
    super('Internal API token not found.', 'INTERNAL_API_TOKEN_NOT_FOUND');
  }
}

export class InternalApiTokenInvalidError extends DomainError {
  constructor() {
    super('Invalid internal API token.', 'INTERNAL_API_TOKEN_INVALID', 401);
  }
}

export class InternalApiTokenExpiredError extends DomainError {
  constructor() {
    super('Internal API token has expired.', 'INTERNAL_API_TOKEN_EXPIRED', 401);
  }
}

export class InternalApiTokenRevokedError extends DomainError {
  constructor() {
    super('Internal API token is revoked.', 'INTERNAL_API_TOKEN_REVOKED', 401);
  }
}

export class InternalApiTokenExpiresAtInvalidError extends DomainError {
  constructor() {
    super(
      'Internal API token expiration must be in the future.',
      'INTERNAL_API_TOKEN_EXPIRES_AT_INVALID',
      400,
    );
  }
}

export class InternalNameInvalidError extends DomainError {
  constructor() {
    super('Internal resource name is invalid.', 'INTERNAL_NAME_INVALID', 400);
  }
}

export class InternalServiceAccountUpdateEmptyError extends DomainError {
  constructor() {
    super(
      'Internal service account update requires at least one field.',
      'INTERNAL_SERVICE_ACCOUNT_UPDATE_EMPTY',
      400,
    );
  }
}

export class InternalScopeInvalidError extends DomainError {
  constructor() {
    super(
      'Internal API token scope is invalid.',
      'INTERNAL_SCOPE_INVALID',
      400,
    );
  }
}

export class InternalScopeRequiredError extends DomainError {
  constructor() {
    super(
      'Internal API token does not include the required scope.',
      'INTERNAL_SCOPE_REQUIRED',
      403,
    );
  }
}

export function isServiceAccountNameUniqueViolation(error: unknown): boolean {
  return isUniqueViolation(error, SERVICE_ACCOUNT_NAME_UNIQUE_CONSTRAINT);
}

export function isServiceApiTokenPrefixUniqueViolation(
  error: unknown,
): boolean {
  return isUniqueViolation(error, SERVICE_API_TOKEN_PREFIX_UNIQUE_CONSTRAINT);
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;

  return driverError?.code === '23505' && driverError.constraint === constraint;
}
