import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted per-variable — this is the only pattern guaranteed to work
// with vi.mock factory hoisting in Vitest 3.x
const mockLimit = vi.hoisted(() => vi.fn());
const mockReturning = vi.hoisted(() => vi.fn());

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: mockLimit,
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: mockReturning,
  },
}));

vi.mock("@/db/schema", () => ({
  users: {},
}));

import { registerUser } from "@/lib/register";
import { ValidationError } from "@/lib/errors";

describe("registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a new user successfully", async () => {
    mockLimit.mockResolvedValue([]); // No existing user
    mockReturning.mockResolvedValue([
      {
        id: "new-user-id",
        name: "Test User",
        email: "test@test.com",
        passwordHash: "hashed_password123",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await registerUser({
      name: "Test User",
      email: "test@test.com",
      password: "password123",
    });

    expect(result).toEqual({
      id: "new-user-id",
      name: "Test User",
      email: "test@test.com",
    });

    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it("throws ValidationError for invalid input", async () => {
    await expect(
      registerUser({
        name: "",
        email: "not-an-email",
        password: "short",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when email already exists", async () => {
    mockLimit.mockResolvedValue([{ id: "existing-user" }]);

    await expect(
      registerUser({
        name: "Test User",
        email: "existing@test.com",
        password: "password123",
      }),
    ).rejects.toThrow(ValidationError);

    await expect(
      registerUser({
        name: "Test User",
        email: "existing@test.com",
        password: "password123",
      }),
    ).rejects.toThrow("An account with this email already exists");
  });

  it("validates name is required", async () => {
    await expect(
      registerUser({
        name: "",
        email: "test@test.com",
        password: "password123",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("validates email format", async () => {
    await expect(
      registerUser({
        name: "Test User",
        email: "not-email",
        password: "password123",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("validates password minimum length", async () => {
    await expect(
      registerUser({
        name: "Test User",
        email: "test@test.com",
        password: "1234567",
      }),
    ).rejects.toThrow("8 characters");
  });
});
