import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  handleApiError,
} from "@/lib/errors";

describe("AppError", () => {
  it("creates an error with the given message and status code", () => {
    const error = new AppError("Something went wrong", 400, "corr-123");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Something went wrong");
    expect(error.statusCode).toBe(400);
    expect(error.correlationId).toBe("corr-123");
    expect(error.name).toBe("AppError");
  });

  it("defaults to status 500 and no correlation ID", () => {
    const error = new AppError("Server error");
    expect(error.statusCode).toBe(500);
    expect(error.correlationId).toBeUndefined();
  });
});

describe("NotFoundError", () => {
  it("creates a 404 error with resource name", () => {
    const error = new NotFoundError("Item");
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("Item not found");
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe("NotFoundError");
  });

  it("includes the ID in the message when provided", () => {
    const error = new NotFoundError("Item", "abc-123");
    expect(error.message).toBe("Item [abc-123] not found");
  });
});

describe("UnauthorizedError", () => {
  it("creates a 401 error with default message", () => {
    const error = new UnauthorizedError();
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("Authentication required");
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe("UnauthorizedError");
  });

  it("accepts a custom message", () => {
    const error = new UnauthorizedError("Session expired");
    expect(error.message).toBe("Session expired");
  });
});

describe("ForbiddenError", () => {
  it("creates a 403 error", () => {
    const error = new ForbiddenError();
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("You do not have permission to perform this action");
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe("ForbiddenError");
  });
});

describe("ValidationError", () => {
  it("creates a 400 error", () => {
    const error = new ValidationError("Invalid input");
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("Invalid input");
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe("ValidationError");
  });
});

describe("handleApiError", () => {
  it("returns structured JSON for AppError instances", () => {
    const error = new AppError("Custom error", 422, "corr-456");
    const response = handleApiError(error);

    expect(response.status).toBe(422);
    return response.json().then((body: Record<string, unknown>) => {
      expect(body).toEqual({
        error: "Custom error",
        correlationId: "corr-456",
      });
    });
  });

  it("returns 500 with generic message for unexpected errors", () => {
    const error = new Error("Something broke");
    const response = handleApiError(error);

    expect(response.status).toBe(500);
    return response.json().then((body: Record<string, unknown>) => {
      expect(body).toEqual({ error: "An unexpected error occurred" });
    });
  });

  it("handles non-Error throws gracefully", () => {
    const response = handleApiError("string error");
    expect(response.status).toBe(500);
  });

  it("returns 401 for UnauthorizedError", () => {
    const error = new UnauthorizedError();
    const response = handleApiError(error);
    expect(response.status).toBe(401);
  });

  it("returns 404 for NotFoundError", () => {
    const error = new NotFoundError("Item");
    const response = handleApiError(error);
    expect(response.status).toBe(404);
  });

  it("returns 400 for ValidationError", () => {
    const error = new ValidationError("Bad data");
    const response = handleApiError(error);
    expect(response.status).toBe(400);
  });
});
