export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class ValidationError extends BadRequestError {
  errors: Record<string, string>;

  constructor(
    message = "Validation error",
    errors: Record<string, string> = {}
  ) {
    super(message);
    this.errors = errors;
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Resource already exists") {
    super(message, 409);
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal server error") {
    super(message, 500);
  }
}
