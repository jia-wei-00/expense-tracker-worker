import type { SupabaseClient } from "@supabase/supabase-js";
import { DB_TABLE } from "../../constants/db";
import { VERIFY_PAYLOAD_PREFIX } from "../../constants/whatsapp";
import type { Env } from "../../env";
import { sendTextMessage } from "./api";

/**
 * Handle the user tapping the "Verify" button on the WhatsApp template message.
 * Sets `is_verified = true` on the whatsapp_users row matching this phone + userId.
 */
export async function handleVerificationReply(
  from: string,
  payload: string,
  supabase: SupabaseClient,
  env: Env,
) {
  const userId = payload.slice(VERIFY_PAYLOAD_PREFIX.length);
  const { error } = await supabase
    .from(DB_TABLE.WHATSAPP_USERS)
    .update({ is_verified: true })
    .eq("phone_number", from)
    .eq("user_id", userId);

  await sendTextMessage(
    from,
    error
      ? "Verification failed. Please try again from the app settings."
      : "Your number is verified! You can now use the expense tracker via WhatsApp.",
    env,
  );
}
