import { WRITE_TOOLS } from "../constants/ai";
import type { Category, PendingAction } from "../types/expense";
import {
  addExpenseArgsSchema,
  deleteExpenseArgsSchema,
} from "../types/expense";

/**
 * Normalize tool-call args from the LLM. The LLM may use `category_id`
 * (matching the tool schema) or `category` — accept either.
 */
export function normalizeAddExpenseArgs(args: Record<string, unknown>) {
  return addExpenseArgsSchema.parse({
    name: args.name,
    amount: args.amount,
    category: args.category_id ?? args.category,
    is_expense: args.is_expense,
    spend_date: args.spend_date,
  });
}

export function parseAddExpenseArgs(args: unknown) {
  return addExpenseArgsSchema.parse(args);
}

export function parseDeleteExpenseArgs(args: unknown) {
  return deleteExpenseArgsSchema.parse(args);
}

export function formatCategoryList(categories: Category[]): string {
  return categories
    .map(
      (c) =>
        `  - id: ${c.id}, name: "${c.name}", type: ${c.is_expense ? "expense" : "income"}`,
    )
    .join("\n");
}

export function isWriteToolName(
  name: string,
): name is PendingAction["toolName"] {
  return (WRITE_TOOLS as readonly string[]).includes(name);
}
