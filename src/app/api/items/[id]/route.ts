import { NextRequest } from "next/server";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { handleApiError, UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const { id } = await params;
    const [item] = await db
      .select()
      .from(items)
      .where(and(eq(items.id, id), eq(items.userId, session.user.id)))
      .limit(1);

    if (!item) throw new NotFoundError("Item", id);
    return Response.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const { id } = await params;

    // Verify ownership
    const [existing] = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, id), eq(items.userId, session.user.id)))
      .limit(1);
    if (!existing) throw new NotFoundError("Item", id);

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    if (Object.keys(parsed.data).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    const [item] = await db
      .update(items)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();

    return Response.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const { id } = await params;

    const [existing] = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, id), eq(items.userId, session.user.id)))
      .limit(1);
    if (!existing) throw new NotFoundError("Item", id);

    await db.delete(items).where(eq(items.id, id));
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
