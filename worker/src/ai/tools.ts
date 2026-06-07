import { tool } from "@langchain/core/tools";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { TOOL_NAME } from "@/constants/ai";
import { DEFAULT_EXPENSE_LIMIT } from "@/constants/app";
import { DB_TABLE } from "@/constants/db";
import type { PendingAction } from "@/types/expense";

/**
 * Thrown from a write-tool's `func` to signal that the action requires user
 * confirmation. The agent loop catches this, records the action, and returns
 * `pending_confirmation` to the model as the tool result.
 */
export class PendingActionInterrupt extends Error {
  constructor(public readonly action: PendingAction) {
    super("Pending action requires confirmation");
    this.name = "PendingActionInterrupt";
  }
}

// ─── Tool input schemas ──────────────────────────────────────────────────────

const addExpenseInputSchema = z.object({
  name: z
    .string()
    .describe(
      'Short transaction label — just the core noun, no amount/currency/date/filler. Examples: "coffee", "grab ride", "salary".',
    ),
  description: z.string().optional().describe("Optional extra note."),
  amount: z.number().positive().describe("Amount in MYR (positive number)."),
  category_id: z
    .number()
    .int()
    .describe("Numeric category ID from the provided list."),
  is_expense: z
    .boolean()
    .describe("true for expense, false for income. Match the category."),
  spend_date: z
    .string()
    .describe(
      "ISO 8601 datetime, e.g. 2026-05-01T20:00:00. Use current datetime if not provided.",
    ),
});

const deleteExpenseInputSchema = z.object({
  id: z.number().int().describe("The expense ID to delete."),
});

const listExpensesInputSchema = z.object({
  category: z.number().int().optional(),
  from: z.string().optional().describe("Start date in ISO format."),
  to: z.string().optional().describe("End date in ISO format."),
  limit: z.number().int().default(DEFAULT_EXPENSE_LIMIT),
});

const getCategoryTotalInputSchema = z.object({
  category_id: z.number().int().describe("Category ID from the provided list."),
  from: z.string().optional().describe("Optional ISO start date."),
  to: z.string().optional().describe("Optional ISO end date."),
});

const getDateRangeTotalInputSchema = z.object({
  from: z.string().describe("ISO start date (inclusive)."),
  to: z.string().describe("ISO end date (inclusive)."),
});

// ─── Supabase result schemas (validate untyped rows) ─────────────────────────

const expenseLookupRowSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const joinedCategorySchema = z.object({
  name: z.string(),
  is_expense: z.boolean().optional(),
});

const aggregateRowSchema = z.object({
  amount: z.coerce.number(),
  is_expense: z.boolean().optional(),
  expense_category: z
    .union([joinedCategorySchema, z.array(joinedCategorySchema), z.null()])
    .optional(),
});

function readJoinedCategory(value: unknown): z.infer<typeof joinedCategorySchema> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = joinedCategorySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

// ─── Tool factory ────────────────────────────────────────────────────────────

/**
 * Build the LangChain tools bound to the current request's Supabase client and
 * (optionally) user id. Each call yields a fresh closure; do not cache across
 * requests.
 */
export function createExpenseTools(
  supabase: SupabaseClient,
  userId?: string,
): DynamicStructuredTool[] {
  const addExpense = tool(
    (args) => {
      throw new PendingActionInterrupt({
        toolName: TOOL_NAME.ADD_EXPENSE,
        args: {
          name: args.name,
          amount: args.amount,
          category: args.category_id,
          is_expense: args.is_expense,
          spend_date: args.spend_date,
        },
      });
    },
    {
      name: TOOL_NAME.ADD_EXPENSE,
      description:
        "Propose adding a new expense or income record. The user will be asked to confirm.",
      schema: addExpenseInputSchema,
    },
  );

  const deleteExpense = tool(
    async (args) => {
      let query = supabase
        .from(DB_TABLE.EXPENSE)
        .select("id, name")
        .eq("id", args.id);
      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query.maybeSingle();
      if (error) {
        return JSON.stringify({ error: error.message });
      }
      const expense = expenseLookupRowSchema.safeParse(data);
      if (!expense.success) {
        return JSON.stringify({ error: `Expense with ID ${args.id} not found` });
      }
      throw new PendingActionInterrupt({
        toolName: TOOL_NAME.DELETE_EXPENSE,
        args: { id: expense.data.id, name: expense.data.name },
      });
    },
    {
      name: TOOL_NAME.DELETE_EXPENSE,
      description: "Propose deleting an expense record by ID. The user will be asked to confirm.",
      schema: deleteExpenseInputSchema,
    },
  );

  const listExpenses = tool(
    async (args) => {
      let query = supabase
        .from(DB_TABLE.EXPENSE)
        .select("id, name, amount, spend_date, is_expense, expense_category(name)")
        .order("spend_date", { ascending: false })
        .limit(args.limit);
      if (userId) query = query.eq("user_id", userId);
      if (args.category !== undefined) query = query.eq("category", args.category);
      if (args.from) query = query.gte("spend_date", args.from);
      if (args.to) query = query.lte("spend_date", args.to);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(data ?? []);
    },
    {
      name: TOOL_NAME.LIST_EXPENSES,
      description: "List the user's expenses with optional filters.",
      schema: listExpensesInputSchema,
    },
  );

  const getCategoryTotal = tool(
    async (args) => {
      let query = supabase
        .from(DB_TABLE.EXPENSE)
        .select("amount, expense_category(name, is_expense)")
        .eq("category", args.category_id);
      if (userId) query = query.eq("user_id", userId);
      if (args.from) query = query.gte("spend_date", args.from);
      if (args.to) query = query.lte("spend_date", args.to);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });

      const rows = z.array(aggregateRowSchema).parse(data ?? []);
      const total = rows.reduce((sum, r) => sum + r.amount, 0);
      const category = readJoinedCategory(rows[0]?.expense_category);

      return JSON.stringify({
        category_id: args.category_id,
        category_name: category?.name ?? null,
        is_expense: category?.is_expense ?? null,
        from: args.from ?? null,
        to: args.to ?? null,
        total,
        count: rows.length,
      });
    },
    {
      name: TOOL_NAME.GET_CATEGORY_TOTAL,
      description:
        "Get the aggregated total and transaction count for a single category. Pass `from` and `to` to scope to a date range, or omit both for all-time.",
      schema: getCategoryTotalInputSchema,
    },
  );

  const getDateRangeTotal = tool(
    async (args) => {
      let query = supabase
        .from(DB_TABLE.EXPENSE)
        .select("amount, is_expense, expense_category(name)")
        .gte("spend_date", args.from)
        .lte("spend_date", args.to);
      if (userId) query = query.eq("user_id", userId);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });

      const rows = z.array(aggregateRowSchema).parse(data ?? []);
      let totalExpense = 0;
      let totalIncome = 0;
      const byCategory: Record<string, number> = {};
      for (const r of rows) {
        if (r.is_expense) totalExpense += r.amount;
        else totalIncome += r.amount;
        const cat = readJoinedCategory(r.expense_category);
        const key = cat?.name ?? "Uncategorized";
        byCategory[key] = (byCategory[key] ?? 0) + r.amount;
      }

      return JSON.stringify({
        from: args.from,
        to: args.to,
        total_expense: totalExpense,
        total_income: totalIncome,
        net: totalIncome - totalExpense,
        count: rows.length,
        by_category: byCategory,
      });
    },
    {
      name: TOOL_NAME.GET_DATE_RANGE_TOTAL,
      description:
        "Summary across a date range: total expense, total income, net, and per-category breakdown.",
      schema: getDateRangeTotalInputSchema,
    },
  );

  return [addExpense, deleteExpense, listExpenses, getCategoryTotal, getDateRangeTotal];
}
