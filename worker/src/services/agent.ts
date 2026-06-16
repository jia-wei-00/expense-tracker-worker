import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ToolMessage,
  type AIMessageChunk,
  type BaseMessage,
} from "@langchain/core/messages";
import type { Callbacks } from "@langchain/core/callbacks/manager";
import type { ChatOpenAI } from "@langchain/openai";
import { MAX_LLM_STEPS, PENDING_CONFIRMATION_REPLY } from "@/constants/app";
import { createExpenseTools, isPendingActionResult } from "@/ai/tools";
import type { PendingAction } from "@/types/expense";

export interface AgentLoopResult {
  text: string | null;
  pendingActions: PendingAction[];
  /** Messages produced during this run (AI + tool messages). Excludes input history. */
  newMessages: BaseMessage[];
}

interface RunAgentLoopParams {
  llm: ChatOpenAI;
  messages: BaseMessage[];
  supabase: SupabaseClient;
  userId?: string;
  enableTools?: boolean;
  /** LangSmith (or other) callbacks; forwarded to every LLM/tool invocation. */
  callbacks?: Callbacks;
  /** Run metadata attached to LangSmith traces (e.g. sessionId, mode). */
  metadata?: Record<string, unknown>;
}

/**
 * Runs the agent loop. Returns when:
 * - The model produces a non-tool text response (text returned).
 * - A write tool requests confirmation (pendingActions returned).
 * - MAX_LLM_STEPS is reached.
 */
export async function runAgentLoop({
  llm,
  messages,
  supabase,
  userId,
  enableTools = true,
  callbacks,
  metadata,
}: RunAgentLoopParams): Promise<AgentLoopResult> {
  const tools = createExpenseTools(supabase, userId);
  const toolsByName = new Map(tools.map((t) => [t.name, t]));
  const llmWithTools = enableTools ? llm.bindTools(tools) : llm;
  const config = { callbacks, metadata };

  const working: BaseMessage[] = [...messages];
  const newMessages: BaseMessage[] = [];
  const pendingActions: PendingAction[] = [];

  for (let step = 0; step < MAX_LLM_STEPS; step++) {
    const aiMessage: AIMessageChunk = await llmWithTools.invoke(working, config);
    working.push(aiMessage);
    newMessages.push(aiMessage);

    const toolCalls = aiMessage.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return {
        text: extractText(aiMessage),
        pendingActions,
        newMessages,
      };
    }

    // LangChain's OpenAI converter strips provider-specific fields like
    // Gemini's `extra_content.google.thought_signature` when serializing
    // `message.tool_calls`. Clearing the logical array forces it to fall
    // back to `additional_kwargs.tool_calls` (the raw response), which
    // preserves thought_signature — required by Gemini 3.x on subsequent
    // turns.
    aiMessage.tool_calls = [];

    for (const tc of toolCalls) {
      const toolCallId = tc.id ?? "";
      const tool = toolsByName.get(tc.name);
      if (!tool) {
        pushToolMessage(
          working,
          newMessages,
          JSON.stringify({ error: `Unknown tool: ${tc.name}` }),
          toolCallId,
          tc.name,
        );
        continue;
      }

      const result = await tool.invoke(tc.args, config);
      if (isPendingActionResult(result)) {
        pendingActions.push(result.pendingAction);
        pushToolMessage(
          working,
          newMessages,
          PENDING_CONFIRMATION_REPLY,
          toolCallId,
          tc.name,
        );
      } else {
        pushToolMessage(working, newMessages, stringify(result), toolCallId, tc.name);
      }
    }

    if (pendingActions.length > 0) {
      return { text: null, pendingActions, newMessages };
    }
  }

  return { text: null, pendingActions, newMessages };
}

function pushToolMessage(
  working: BaseMessage[],
  collected: BaseMessage[],
  content: string,
  toolCallId: string,
  name: string,
) {
  const msg = new ToolMessage({ content, tool_call_id: toolCallId, name });
  working.push(msg);
  collected.push(msg);
}

function extractText(message: AIMessageChunk): string | null {
  const { content } = message;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts = content.flatMap((block) => {
    if (typeof block === "string") return [block];
    if (block && typeof block === "object" && "text" in block) {
      const text = (block as { text?: unknown }).text;
      return typeof text === "string" ? [text] : [];
    }
    return [];
  });
  return parts.length > 0 ? parts.join("") : null;
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
