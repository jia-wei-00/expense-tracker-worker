import OpenAI from "openai";
import { OPENROUTER_BASE_URL, WRITE_TOOLS } from "./constants";
import type { AddExpenseArgs, Category, PendingAction } from "./types";

export function normalizeAddExpenseArgs(args: Record<string, unknown>): AddExpenseArgs {
  return {
    name: String(args.name ?? ""),
    amount: Number(args.amount ?? 0),
    category: Number(args.category_id ?? args.category ?? 0),
    is_expense: args.is_expense !== false,
    spend_date: String(args.spend_date ?? new Date().toISOString()),
  };
}

export function parseAddExpenseArgs(args: unknown): AddExpenseArgs {
  const raw = args as Record<string, unknown>;
  return {
    name: String(raw.name ?? ""),
    amount: Number(raw.amount ?? 0),
    category: Number(raw.category ?? 0),
    is_expense: raw.is_expense !== false,
    spend_date: String(raw.spend_date ?? new Date().toISOString()),
  };
}

export function parseDeleteExpenseArgs(args: unknown): { id: number } {
  const raw = args as Record<string, unknown>;
  return { id: Number(raw.id ?? 0) };
}

export function formatCategoryList(categories: Category[]): string {
  return categories
    .map((c) => `  - id: ${c.id}, name: "${c.name}", type: ${c.is_expense ? "expense" : "income"}`)
    .join("\n");
}

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ baseURL: OPENROUTER_BASE_URL, apiKey });
}

export function isWriteToolName(name: string): name is PendingAction["toolName"] {
  return (WRITE_TOOLS as readonly string[]).includes(name);
}
