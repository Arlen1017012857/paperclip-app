import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ItemList } from "@/components/ui/item-list";
import { CreateItemForm } from "@/components/forms/create-item-form";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userItems = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, session.user.id), eq(items.status, "active")))
    .orderBy(desc(items.createdAt));

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Signed in as {session.user.email}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Create item</h2>
        <CreateItemForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">
          Items ({userItems.length})
        </h2>
        <ItemList items={userItems} />
      </section>
    </main>
  );
}
