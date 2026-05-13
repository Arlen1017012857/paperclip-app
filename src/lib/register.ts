import { hash } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ValidationError } from "./errors";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export async function registerUser(input: RegisterInput) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }

  const { name, email, password } = parsed.data;

  // Check for existing user
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    throw new ValidationError("An account with this email already exists");
  }

  const passwordHash = await hash(password, 12);
  const now = new Date();

  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { id: user.id, name: user.name, email: user.email };
}
