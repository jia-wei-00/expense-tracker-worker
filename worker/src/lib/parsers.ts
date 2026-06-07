import type { Category } from "@/types/expense";

export function formatCategoryList(categories: Category[]): string {
  return categories
    .map(
      (c) =>
        `  - id: ${c.id}, name: "${c.name}", type: ${c.is_expense ? "expense" : "income"}`,
    )
    .join("\n");
}
