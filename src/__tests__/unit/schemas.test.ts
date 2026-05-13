import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Extract validation schemas from the codebase and test them.
 * These mirror the schemas used in auth.ts, register.ts, and API routes.
 */

// From src/lib/auth.ts
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// From src/lib/register.ts
const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

// From src/app/api/items/route.ts
const createItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
});

const updateItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

describe("loginSchema", () => {
  it("accepts valid login credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({ password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts valid registration input", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "user@example.com",
      password: "1234567",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("8 characters");
    }
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 characters", () => {
    const result = registerSchema.safeParse({
      name: "x".repeat(101),
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password exceeding 128 characters", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "user@example.com",
      password: "x".repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("createItemSchema", () => {
  it("accepts valid item with title only", () => {
    const result = createItemSchema.safeParse({ title: "My item" });
    expect(result.success).toBe(true);
  });

  it("accepts item with title and description", () => {
    const result = createItemSchema.safeParse({
      title: "My item",
      description: "A description",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createItemSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 200 characters", () => {
    const result = createItemSchema.safeParse({ title: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 2000 characters", () => {
    const result = createItemSchema.safeParse({
      title: "Valid title",
      description: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("allows description to be undefined", () => {
    const result = createItemSchema.safeParse({ title: "Item" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });
});

describe("updateItemSchema", () => {
  it("accepts partial update with status only", () => {
    const result = updateItemSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(true);
  });

  it("accepts update with all fields", () => {
    const result = updateItemSchema.safeParse({
      title: "New title",
      description: "New description",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status value", () => {
    const result = updateItemSchema.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = updateItemSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects title that is too long", () => {
    const result = updateItemSchema.safeParse({ title: "x".repeat(201) });
    expect(result.success).toBe(false);
  });
});
