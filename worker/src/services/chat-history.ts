import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import {
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
  type BaseMessage,
  type StoredMessage,
  type StoredMessageData,
} from "@langchain/core/messages";
import { DB_TABLE } from "@/constants/db";

interface ChatMessageRow {
  type: unknown;
  data: unknown;
}

/**
 * Chat history backed by the `chat_message` table. Each row stores the result
 * of LangChain's `mapChatMessagesToStoredMessages` so the full message shape
 * round-trips through Supabase without manual field mapping.
 */
export class SupabaseChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ["expense_tracker", "stores", "message", "supabase"];

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly sessionId: string,
  ) {
    super();
  }

  async getMessages(): Promise<BaseMessage[]> {
    const { data, error } = await this.supabase
      .from(DB_TABLE.CHAT_MESSAGE)
      .select("type, data")
      .eq("session_id", this.sessionId)
      .order("id", { ascending: true });

    if (error) throw new Error(`Failed to load chat history: ${error.message}`);

    const rows: ChatMessageRow[] = data ?? [];
    const stored = rows.map(toStoredMessage);
    return mapStoredMessagesToChatMessages(stored);
  }

  async addMessage(message: BaseMessage): Promise<void> {
    const [stored] = mapChatMessagesToStoredMessages([message]);
    const { error } = await this.supabase
      .from(DB_TABLE.CHAT_MESSAGE)
      .insert({
        session_id: this.sessionId,
        type: stored.type,
        data: stored.data,
      });
    if (error) throw new Error(`Failed to persist chat message: ${error.message}`);
  }

  async addMessages(messages: BaseMessage[]): Promise<void> {
    if (messages.length === 0) return;
    const stored = mapChatMessagesToStoredMessages(messages);
    const rows = stored.map((s) => ({
      session_id: this.sessionId,
      type: s.type,
      data: s.data,
    }));
    const { error } = await this.supabase.from(DB_TABLE.CHAT_MESSAGE).insert(rows);
    if (error) throw new Error(`Failed to persist chat messages: ${error.message}`);
  }

  async clear(): Promise<void> {
    const { error } = await this.supabase
      .from(DB_TABLE.CHAT_MESSAGE)
      .delete()
      .eq("session_id", this.sessionId);
    if (error) throw new Error(`Failed to clear chat history: ${error.message}`);
  }
}

// ─── Row → StoredMessage conversion (narrows untyped JSON to LangChain shape) ─

function toStoredMessage(row: ChatMessageRow): StoredMessage {
  const data = isRecord(row.data) ? row.data : {};
  const storedData: StoredMessageData = {
    content: stringOr(data.content, ""),
    role: stringOrUndefined(data.role),
    name: stringOrUndefined(data.name),
    tool_call_id: stringOrUndefined(data.tool_call_id),
    additional_kwargs: isRecord(data.additional_kwargs) ? data.additional_kwargs : undefined,
    response_metadata: isRecord(data.response_metadata) ? data.response_metadata : undefined,
    id: stringOrUndefined(data.id),
  };
  return { type: stringOr(row.type, "human"), data: storedData };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
