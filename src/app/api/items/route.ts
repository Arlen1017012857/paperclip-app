import { NextRequest } from "next/server";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { handleApiError, UnauthorizedError, ValidationError } from "@/lib/errors";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const userItems = await db
      .select()
      .from(items)
      .where(and(eq(items.userId, session.user.id), eq(items.status, "active")))
      .orderBy(desc(items.createdAt));

    return Response.json({ items: userItems });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const now = new Date();
    const [item] = await db
      .insert(items)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
