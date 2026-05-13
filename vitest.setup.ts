import "@testing-library/jest-dom/vitest";

// Mock crypto.randomUUID for consistent test output
if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  Object.defineProperty(crypto, "randomUUID", {
    value: () => "00000000-0000-0000-0000-000000000001",
  });
}
