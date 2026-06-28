import type { SupabaseClient } from "@supabase/supabase-js";
import { TOOL_NAME } from "@/constants/ai";
import { BUTTON_PREFIX } from "@/constants/whatsapp";
import { DB_TABLE } from "@/constants/db";
import { PENDING_ACTION_TTL_MS } from "@/constants/app";
import type { Env } from "@/env";
import {
  pendingActionListSchema,
  type AddExpenseArgs,
  type PendingAction,
} from "@/types/expense";
import { sendInteractiveButtons, sendTextMessage } from "@/services/whatsapp/api";
import { sendExpenseAddedPush, type AddedExpense } from "@/services/whatsapp/push";

/**
 * Handle the Confirm/Cancel button reply for a batch of pending actions.
 * On confirm, runs all adds in a single insert and all deletes in a single
 * `in("id", ids)` call, then deletes the pending row.
 */
export async function handleConfirmationReply(
  from: string,
  buttonId: string,
  userId: string,
  supabase: SupabaseClient,
  env: Env,
) {
  const isConfirm = buttonId.startsWith(BUTTON_PREFIX.CONFIRM);
  const isCancel = buttonId.startsWith(BUTTON_PREFIX.CANCEL);
  if (!isConfirm && !isCancel) return;

  const pendingId = buttonId.slice(
    (isConfirm ? BUTTON_PREFIX.CONFIRM : BUTTON_PREFIX.CANCEL).length,
  );

  if (isCancel) {
    await supabase
      .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
      .delete()
      .eq("id", pendingId);
    await sendTextMessage(from, "Cancelled. Anything else I can help with?", env);
    return;
  }

  const { data: pending } = await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .select("actions")
    .eq("id", pendingId)
    .eq("phone_number", from)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!pending) {
    await sendTextMessage(from, "This action has expired. Please try again.", env);
    return;
  }

  await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .delete()
    .eq("id", pendingId);

  const parsed = pendingActionListSchema.safeParse(pending.actions);
  if (!parsed.success || parsed.data.length === 0) {
    await sendTextMessage(from, "Sorry, this action was malformed.", env);
    return;
  }

  await sendTextMessage(from, await executeBatch(parsed.data, userId, supabase), env);
}

/**
 * Save a batch of pending actions and ask the user to confirm them all.
 */
export async function savePendingAndAskConfirmation(
  from: string,
  actions: PendingAction[],
  categoryNames: Map<number, string>,
  supabase: SupabaseClient,
  env: Env,
) {
  const expiresAt = new Date(Date.now() + PENDING_ACTION_TTL_MS).toISOString();

  const { data: inserted } = await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .insert({ phone_number: from, actions, expires_at: expiresAt })
    .select("id")
    .single();

  const pendingId: string = inserted?.id ?? "";

  await sendInteractiveButtons(
    from,
    buildConfirmationText(actions, categoryNames),
    [
      { id: `${BUTTON_PREFIX.CONFIRM}${pendingId}`, title: "Confirm" },
      { id: `${BUTTON_PREFIX.CANCEL}${pendingId}`, title: "Cancel" },
    ],
    env,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function executeBatch(
  actions: PendingAction[],
  userId: string,
  supabase: SupabaseClient,
): Promise<string> {
  const adds: AddExpenseArgs[] = [];
  const deleteIds: number[] = [];
  for (const action of actions) {
    if (action.toolName === TOOL_NAME.ADD_EXPENSE) adds.push(action.args);
    else deleteIds.push(action.args.id);
  }

  const [addResult, deleteError] = await Promise.all([
    adds.length > 0
      ? supabase
          .from(DB_TABLE.EXPENSE)
          .insert(adds.map((a) => ({ ...a, user_id: userId })))
          .select("id, name, amount")
      : Promise.resolve({ data: [], error: null }),
    deleteIds.length > 0
      ? supabase
          .from(DB_TABLE.EXPENSE)
          .delete()
          .in("id", deleteIds)
          .eq("user_id", userId)
          .then((r) => r.error)
      : Promise.resolve(null),
  ]);

  const addError = addResult.error;
  const addedRows = (addResult.data ?? []) as AddedExpense[];

  // Notify the linked device that expenses were added (best-effort).
  if (!addError && addedRows.length > 0) {
    await notifyExpensesAdded(userId, addedRows, supabase);
  }

  const parts: string[] = [];
  if (adds.length > 0) {
    parts.push(addError ? `failed to add ${adds.length}` : `added ${adds.length}`);
  }
  if (deleteIds.length > 0) {
    parts.push(
      deleteError ? `failed to delete ${deleteIds.length}` : `deleted ${deleteIds.length}`,
    );
  }

  const summary = parts.join(", ");
  return addError || deleteError ? `Partial success: ${summary}.` : `Done! ${summary}.`;
}

/** Looks up the user's push token and sends an "expense added" notification. */
async function notifyExpensesAdded(
  userId: string,
  expenses: AddedExpense[],
  supabase: SupabaseClient,
): Promise<void> {
  const { data } = await supabase
    .from(DB_TABLE.WHATSAPP_USERS)
    .select("push_token")
    .eq("user_id", userId)
    .maybeSingle();

  await sendExpenseAddedPush(data?.push_token as string | null | undefined, expenses);
}

function buildConfirmationText(
  actions: PendingAction[],
  categoryNames: Map<number, string>,
): string {
  const describe = (a: PendingAction): string => {
    if (a.toolName === TOOL_NAME.ADD_EXPENSE) {
      const category = categoryNames.get(a.args.category) ?? "Uncategorized";
      const kind = a.args.is_expense ? "Add" : "Add income";
      return `${kind} ${a.args.name} — RM${a.args.amount} (${category})`;
    }
    return `Delete ${a.args.name ?? `expense #${a.args.id}`}`;
  };

  if (actions.length === 1) {
    return `${describe(actions[0])}?`;
  }

  const lines = actions.map((a, i) => `${i + 1}. ${describe(a)}`);
  return `Confirm ${actions.length} actions?\n${lines.join("\n")}`;
}
