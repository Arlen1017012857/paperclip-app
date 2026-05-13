import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth before any imports
import type { Session } from "next-auth";

type AuthResult = Session | null;
const mockAuth = vi.fn<() => Promise<AuthResult>>();

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// In-memory store for mocked DB operations
interface Item {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

let store: Item[] = [];

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/db/schema", () => ({
  items: {},
}));

// Mock drizzle-orm operators used in route handlers
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq"),
  and: vi.fn(() => "and"),
  desc: vi.fn(() => "desc"),
}));

// Dynamic import after mocks are set up
async function getHandlers() {
  const itemsModule = await import("@/app/api/items/route");
  const itemIdModule = await import("@/app/api/items/[id]/route");
  return { itemsModule, itemIdModule };
}

describe("Items API - GET /api/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = [];
  });

  it("returns 401 when not authenticated", async () => {
mockAuth.mockResolvedValue(null);

    const { itemsModule } = await getHandlers();
    const response = await itemsModule.GET();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  it("returns empty array when user has no items", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockResolvedValue([]);

    const { itemsModule } = await getHandlers();
    const response = await itemsModule.GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.items).toEqual([]);
  });

  it("returns user's active items", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    const fakeItems = [
      {
        id: "item-1",
        userId: "user-1",
        title: "Test Item",
        description: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockResolvedValue(fakeItems);

    const { itemsModule } = await getHandlers();
    const response = await itemsModule.GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe("Test Item");
  });
});

describe("Items API - POST /api/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = [];
    mockDb.values.mockReturnThis();
    mockDb.returning.mockImplementation(() => Promise.resolve([store[0] || null]));
  });

  it("returns 401 when not authenticated", async () => {
mockAuth.mockResolvedValue(null);

    const { itemsModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Item" }),
    });
    const response = await itemsModule.POST(req);
    expect(response.status).toBe(401);
  });

  it("creates an item with valid data", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    const createdItem = {
      id: crypto.randomUUID(),
      userId: "user-1",
      title: "New Item",
      description: null,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store = [createdItem];

    mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([createdItem]);

    const { itemsModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Item" }),
    });
    const response = await itemsModule.POST(req);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.item.title).toBe("New Item");
  });

  it("returns 400 for empty title", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    const { itemsModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    const response = await itemsModule.POST(req);
    expect(response.status).toBe(400);
  });
});

describe("Items API - GET /api/items/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
mockAuth.mockResolvedValue(null);

    const { itemIdModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items/item-1");
    const response = await itemIdModule.GET(req, {
      params: Promise.resolve({ id: "item-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 for non-existent item", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);

    const { itemIdModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items/nonexistent");
    const response = await itemIdModule.GET(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns the item when found", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    const fakeItem = {
      id: "item-1",
      userId: "user-1",
      title: "Test Item",
      description: "A test",
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([fakeItem]);

    const { itemIdModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items/item-1");
    const response = await itemIdModule.GET(req, {
      params: Promise.resolve({ id: "item-1" }),
    });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.item.title).toBe("Test Item");
  });
});

describe("Items API - PATCH /api/items/[id]", () => {
  beforeEach(() => {
    // Use resetAllMocks to clear once-queues that clearAllMocks preserves
    vi.resetAllMocks();
    // Re-establish chain defaults (terminal methods like limit/returning excluded)
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.delete.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.values.mockReturnThis();
  });

  it("returns 401 when not authenticated", async () => {
mockAuth.mockResolvedValue(null);

    const { itemIdModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items/item-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });
    const response = await itemIdModule.PATCH(req, {
      params: Promise.resolve({ id: "item-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("updates item title", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    const existingItem = { id: "item-1", userId: "user-1" };
    const updatedItem = {
      id: "item-1",
      userId: "user-1",
      title: "Updated Title",
      description: null,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.where
      .mockReturnValueOnce({
        // First call: ownership check
        limit: vi.fn().mockResolvedValueOnce([existingItem]),
      })
      .mockReturnValueOnce({
        // Second call: update
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([updatedItem]),
      });

    const { itemIdModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items/item-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Title" }),
    });

    // Mock ownership check
    mockDb.where.mockReturnThis();
    mockDb.limit
      .mockResolvedValueOnce([existingItem]) // ownership check
      .mockResolvedValueOnce([updatedItem]); // update result (won't be reached)

    const response = await itemIdModule.PATCH(req, {
      params: Promise.resolve({ id: "item-1" }),
    });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.item.title).toBe("Updated Title");
  });

  it("returns 404 when updating non-owned item", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);

    const { itemIdModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items/item-other", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hacked" }),
    });
    const response = await itemIdModule.PATCH(req, {
      params: Promise.resolve({ id: "item-other" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("Items API - DELETE /api/items/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
mockAuth.mockResolvedValue(null);

    const { itemIdModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items/item-1", {
      method: "DELETE",
    });
    const response = await itemIdModule.DELETE(req, {
      params: Promise.resolve({ id: "item-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("deletes existing item", async () => {
mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });

    // ownership check
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([{ id: "item-1", userId: "user-1" }]);

    const { itemIdModule } = await getHandlers();
    const req = new NextRequest("http://localhost/api/items/item-1", {
      method: "DELETE",
    });
    const response = await itemIdModule.DELETE(req, {
      params: Promise.resolve({ id: "item-1" }),
    });
    expect(response.status).toBe(204);
  });
});
