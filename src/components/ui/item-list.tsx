import { items } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

type Item = InferSelectModel<typeof items>;

export function ItemList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">No items yet. Create your first one above.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-gray-200 bg-white px-4 py-3"
        >
          <h3 className="font-medium text-sm">{item.title}</h3>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Created {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
