import type { SupabaseClient } from "@supabase/supabase-js";
import { TOOL_NAME } from "../../constants/ai";
import { BUTTON_PREFIX } from "../../constants/whatsapp";
import { DB_TABLE } from "../../constants/db";
import { PENDING_ACTION_TTL_MS } from "../../constants/app";
import type { Env } from "../../env";
import type { PendingAction } from "../../types/expense";
import {
  parseAddExpenseArgs,
  parseDeleteExpenseArgs,
} from "../../lib/parsers";
import { sendInteractiveButtons, sendTextMessage } from "./api";

/**
 * Handle confirm/cancel button taps for expense add/delete actions.
 * Reads the pending action from the DB, executes it, then deletes the record.
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
    isConfirm ? BUTTON_PREFIX.CONFIRM.length : BUTTON_PREFIX.CANCEL.length,
  );

  if (isCancel) {
    await supabase
      .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
      .delete()
      .eq("id", pendingId);
    await sendTextMessage(
      from,
      "Cancelled. Anything else I can help with?",
      env,
    );
    return;
  }

  const { data: pending } = await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .select("*")
    .eq("id", pendingId)
    .eq("phone_number", from)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!pending) {
    await sendTextMessage(from, "This action has expired. Please try again.", env);
    return;
  }

  await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .delete()
    .eq("id", pendingId);

  if (pending.tool_name === TOOL_NAME.ADD_EXPENSE) {
    const args = parseAddExpenseArgs(pending.args);
    const { error } = await supabase
      .from(DB_TABLE.EXPENSE)
      .insert({ ...args, user_id: userId });
    await sendTextMessage(
      from,
      error
        ? "Failed to save. Please try again."
        : `Done! ${args.name} RM${args.amount} saved.`,
      env,
    );
  } else if (pending.tool_name === TOOL_NAME.DELETE_EXPENSE) {
    const { id } = parseDeleteExpenseArgs(pending.args);
    const { error } = await supabase
      .from(DB_TABLE.EXPENSE)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    await sendTextMessage(
      from,
      error ? "Failed to delete. Please try again." : "Done! Expense deleted.",
      env,
    );
  }
}

/**
 * Save a pending action and send the user a confirmation message with buttons.
 */
export async function savePendingAndAskConfirmation(
  from: string,
  action: PendingAction,
  supabase: SupabaseClient,
  env: Env,
) {
  const expiresAt = new Date(Date.now() + PENDING_ACTION_TTL_MS).toISOString();

  const { data: inserted } = await supabase
    .from(DB_TABLE.WHATSAPP_PENDING_ACTIONS)
    .insert({
      phone_number: from,
      tool_name: action.toolName,
      args: action.args,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  const pendingId: string = inserted?.id ?? "";

  const confirmText =
    action.toolName === TOOL_NAME.ADD_EXPENSE
      ? `Add "${action.args.name}" RM${action.args.amount}?`
      : `Delete "${action.args.name ?? `expense #${action.args.id}`}"?`;

  await sendInteractiveButtons(
    from,
    confirmText,
    [
      { id: `${BUTTON_PREFIX.CONFIRM}${pendingId}`, title: "Confirm" },
      { id: `${BUTTON_PREFIX.CANCEL}${pendingId}`, title: "Cancel" },
    ],
    env,
  );
}
