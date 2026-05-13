import { describe, it, expect, vi } from "vitest";
import { registerUser } from "./register";

// Mock the database
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.resolve([{ id: "new-id", name: "Test User", email: "test@example.com" }]),
        ),
      })),
    })),
  },
}));

describe("registerUser", () => {
  it("validates input fields", async () => {
    await expect(
      registerUser({ name: "", email: "bad", password: "short" }),
    ).rejects.toThrow();
  });

  it("rejects short passwords", async () => {
    await expect(
      registerUser({ name: "Test", email: "test@example.com", password: "1234567" }),
    ).rejects.toThrow("at least 8 characters");
  });

  it("rejects invalid emails", async () => {
    await expect(
      registerUser({ name: "Test", email: "not-an-email", password: "longenoughpassword" }),
    ).rejects.toThrow();
  });
});
