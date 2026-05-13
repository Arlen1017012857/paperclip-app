import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db", () => ({
  db: {},
}));

vi.mock("@/db/schema", () => ({
  users: {},
}));

vi.mock("@/lib/register", () => ({
  registerUser: vi.fn(),
  RegisterInput: {},
}));

async function getHandler() {
  const mod = await import("@/app/api/register/route");
  return mod.POST;
}

describe("Register API - POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 with user data on successful registration", async () => {
    const { registerUser } = await import("@/lib/register");
    vi.mocked(registerUser).mockResolvedValue({
      id: "user-1",
      name: "Test User",
      email: "test@test.com",
    });

    const handler = await getHandler();
    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test@test.com",
        password: "password123",
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.user.email).toBe("test@test.com");
    expect(body.user.name).toBe("Test User");
  });

  it("returns 400 when registration fails (e.g., duplicate email)", async () => {
    const { registerUser } = await import("@/lib/register");
    const { ValidationError } = await import("@/lib/errors");
    vi.mocked(registerUser).mockRejectedValue(
      new ValidationError("An account with this email already exists"),
    );

    const handler = await getHandler();
    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "existing@test.com",
        password: "password123",
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("An account with this email already exists");
  });

  it("returns 500 for unexpected errors", async () => {
    const { registerUser } = await import("@/lib/register");
    vi.mocked(registerUser).mockRejectedValue(new Error("DB connection failed"));

    const handler = await getHandler();
    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test@test.com",
        password: "password123",
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("An unexpected error occurred");
  });
});
