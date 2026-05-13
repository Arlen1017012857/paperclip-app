import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  handleApiError,
} from "./errors";

describe("AppError", () => {
  it("creates an error with message and status code", () => {
    const err = new AppError("test error", 400, "corr-123");
    expect(err.message).toBe("test error");
    expect(err.statusCode).toBe(400);
    expect(err.correlationId).toBe("corr-123");
    expect(err.name).toBe("AppError");
  });
});

describe("NotFoundError", () => {
  it("creates a 404 error with resource name", () => {
    const err = new NotFoundError("Item", "abc-123");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Item [abc-123] not found");
  });
});

describe("UnauthorizedError", () => {
  it("creates a 401 error with default message", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Authentication required");
  });
});

describe("ForbiddenError", () => {
  it("creates a 403 error", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });
});

describe("ValidationError", () => {
  it("creates a 400 error", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("invalid input");
  });
});

describe("handleApiError", () => {
  it("returns AppError status and message", () => {
    const err = new NotFoundError("Item", "x");
    const res = handleApiError(err);
    expect(res.status).toBe(404);
  });

  it("returns 500 for unexpected errors", () => {
    const res = handleApiError(new Error("something broke"));
    expect(res.status).toBe(500);
  });

  it("includes correlationId when present", () => {
    const err = new AppError("test", 500, "corr-1");
    const res = handleApiError(err);
    expect(res.status).toBe(500);
  });
});
