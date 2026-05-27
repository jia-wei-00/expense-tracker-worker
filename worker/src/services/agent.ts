import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_EXPENSE_LIMIT, MAX_LLM_STEPS } from "../constants/app";
import { TOOL_NAME } from "../constants/ai";
import { DB_TABLE } from "../constants/db";
import { PENDING_CONFIRMATION_REPLY } from "../constants/app";
import { tools } from "../ai/tools";
import {
  isWriteToolName,
  normalizeAddExpenseArgs,
} from "../lib/parsers";
import type { PendingAction } from "../types/expense";

export interface AgentLoopResult {
  text: string | null;
  pendingActions: PendingAction[];
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}

type JoinedCategory = { name: string; is_expense: boolean } | null;

function readJoinedCategory(value: unknown): JoinedCategory {
  if (Array.isArray(value)) {
    return (value[0] as JoinedCategory) ?? null;
  }
  return (value as JoinedCategory) ?? null;
}

/**
 * Runs the LLM agent loop. Returns when:
 * - The model produces a non-tool text response (text returned)
 * - The model requests a write tool (pendingActions returned for confirmation)
 * - MAX_LLM_STEPS is reached
 *
 * `supabase` is used for read tools. It can be a user-scoped client (with JWT)
 * or a service client — caller decides. Write operations are NOT executed here;
 * they're returned as pending actions for the caller/frontend to confirm.
 */
export async function runAgentLoop({
  openai,
  model,
  messages,
  supabase,
  userId,
  enableTools = true,
}: {
  openai: OpenAI;
  model: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  supabase: SupabaseClient;
  userId?: string;
  enableTools?: boolean;
}): Promise<AgentLoopResult> {
  for (let step = 0; step < MAX_LLM_STEPS; step++) {
    const response = await openai.chat.completions.create({
      model,
      messages,
      tools: enableTools ? tools : undefined,
    });

    const msg = response.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) {
      return {
        text: typeof msg.content === "string" ? msg.content : null,
        pendingActions: [],
        messages,
      };
    }

    const pendingActions: PendingAction[] = [];
    const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] =
      [];

    const pushResult = (
      toolCallId: string,
      payload: unknown,
    ) =>
      toolResults.push({
        role: "tool",
        tool_call_id: toolCallId,
        content: JSON.stringify(payload),
      });

    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments ?? "{}") as Record<
        string,
        unknown
      >;

      if (isWriteToolName(tc.function.name)) {
        if (tc.function.name === TOOL_NAME.ADD_EXPENSE) {
          pendingActions.push({
            toolName: tc.function.name,
            args: normalizeAddExpenseArgs(args),
          });
          toolResults.push({
            role: "tool",
            tool_call_id: tc.id,
            content: PENDING_CONFIRMATION_REPLY,
          });
        } else {
          const id = Number(args.id);
          let lookupQuery = supabase
            .from(DB_TABLE.EXPENSE)
            .select("id, name")
            .eq("id", id);
          if (userId) lookupQuery = lookupQuery.eq("user_id", userId);
          const { data: expense } = await lookupQuery.maybeSingle();

          if (!expense) {
            pushResult(tc.id, { error: `Expense with ID ${id} not found` });
          } else {
            pendingActions.push({
              toolName: tc.function.name,
              args: { id: expense.id as number, name: expense.name as string },
            });
            toolResults.push({
              role: "tool",
              tool_call_id: tc.id,
              content: PENDING_CONFIRMATION_REPLY,
            });
          }
        }
        continue;
      }

      if (tc.function.name === TOOL_NAME.LIST_EXPENSES) {
        let query = supabase
          .from(DB_TABLE.EXPENSE)
          .select(
            "id, name, amount, spend_date, is_expense, expense_category(name)",
          )
          .order("spend_date", { ascending: false })
          .limit(Number(args.limit ?? DEFAULT_EXPENSE_LIMIT));

        if (userId) query = query.eq("user_id", userId);
        if (args.category) query = query.eq("category", Number(args.category));
        if (args.from) query = query.gte("spend_date", String(args.from));
        if (args.to) query = query.lte("spend_date", String(args.to));

        const { data, error } = await query;
        pushResult(tc.id, error ? { error: error.message } : data);
        continue;
      }

      if (tc.function.name === TOOL_NAME.GET_CATEGORY_TOTAL) {
        const categoryId = Number(args.category_id);
        let query = supabase
          .from(DB_TABLE.EXPENSE)
          .select("amount, expense_category(name, is_expense)")
          .eq("category", categoryId);
        if (userId) query = query.eq("user_id", userId);
        if (args.from) query = query.gte("spend_date", String(args.from));
        if (args.to) query = query.lte("spend_date", String(args.to));

        const { data, error } = await query;
        if (error) {
          pushResult(tc.id, { error: error.message });
          continue;
        }
        const rows = (data ?? []) as Array<{
          amount: number;
          expense_category: unknown;
        }>;
        const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
        const category = readJoinedCategory(rows[0]?.expense_category);
        pushResult(tc.id, {
          category_id: categoryId,
          category_name: category?.name ?? null,
          is_expense: category?.is_expense ?? null,
          from: args.from ?? null,
          to: args.to ?? null,
          total,
          count: rows.length,
        });
        continue;
      }

      if (tc.function.name === TOOL_NAME.GET_DATE_RANGE_TOTAL) {
        let query = supabase
          .from(DB_TABLE.EXPENSE)
          .select("amount, is_expense, expense_category(name)")
          .gte("spend_date", String(args.from))
          .lte("spend_date", String(args.to));
        if (userId) query = query.eq("user_id", userId);

        const { data, error } = await query;
        if (error) {
          pushResult(tc.id, { error: error.message });
          continue;
        }
        const rows = (data ?? []) as Array<{
          amount: number;
          is_expense: boolean;
          expense_category: unknown;
        }>;
        let totalExpense = 0;
        let totalIncome = 0;
        const byCategory: Record<string, number> = {};
        for (const r of rows) {
          const amount = Number(r.amount);
          if (r.is_expense) totalExpense += amount;
          else totalIncome += amount;
          const cat = readJoinedCategory(r.expense_category);
          const name = cat?.name ?? "Uncategorized";
          byCategory[name] = (byCategory[name] ?? 0) + amount;
        }
        pushResult(tc.id, {
          from: args.from,
          to: args.to,
          total_expense: totalExpense,
          total_income: totalIncome,
          net: totalIncome - totalExpense,
          count: rows.length,
          by_category: byCategory,
        });
        continue;
      }

    }

    if (pendingActions.length > 0) {
      return { text: null, pendingActions, messages };
    }

    messages.push(...toolResults);
  }

  return { text: null, pendingActions: [], messages };
}
