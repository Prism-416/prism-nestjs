export class DomainError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NotExistsError extends DomainError {
  constructor(message = 'Resource not found.', code = 'NOT_EXISTS') {
    super(message, code, 404);
    this.name = 'NotExistsError';
  }
}

export class DuplicateError extends DomainError {
  constructor(message = 'Duplicate resource.', code = 'DUPLICATE') {
    super(message, code, 409);
    this.name = 'DuplicateError';
  }
}

export class UnauthorizedDomainError extends DomainError {
  constructor(message = 'Unauthorized.', code = 'UNAUTHORIZED') {
    super(message, code, 401);
    this.name = 'UnauthorizedDomainError';
  }
}
