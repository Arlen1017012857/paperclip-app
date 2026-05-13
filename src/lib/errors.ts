/**
 * Application error classes that never leak stack traces to the client.
 *
 * In production, all errors are logged server-side with full detail.
 * Only the `message` and optional `correlationId` are returned to the client.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public correlationId?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` [${id}]` : ""} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

type ErrorResponse = {
  error: string;
  correlationId?: string;
};

/**
 * Safely handle errors in API routes.
 * Never exposes stack traces in production.
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    const body: ErrorResponse = { error: error.message };
    if (error.correlationId) body.correlationId = error.correlationId;
    return Response.json(body, { status: error.statusCode });
  }

  // Unexpected error — log details server-side
  console.error("[unhandled]", error);
  return Response.json(
    { error: "An unexpected error occurred" },
    { status: 500 },
  );
}
