"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  isLoading?: boolean;
}

export interface PendingToolCall {
  toolName: string;
  args: {
    name?: string;
    amount?: number;
    category?: number;
    is_expense?: boolean;
    spend_date?: string;
    id?: number;
  };
}

interface AgentResponse {
  message: string | null;
  pendingToolCalls?: PendingToolCall[];
  sessionId?: string | null;
}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<PendingToolCall[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sendMessage = async (text: string) => {
    if (loading || !text.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setPendingToolCalls(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      if (!workerUrl) throw new Error("Worker URL not configured");

      const res = await fetch(`${workerUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message: userMsg.content,
          ...(sessionId ? { sessionId } : {}),
        }),
      });

      if (!res.ok) throw new Error("Worker request failed");

      const data: AgentResponse = await res.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message! },
        ]);
      }

      if (data.pendingToolCalls && data.pendingToolCalls.length > 0) {
        setPendingToolCalls(data.pendingToolCalls);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingToolCalls || pendingToolCalls.length === 0) return;
    setLoading(true);

    const toAdd = pendingToolCalls
      .filter((tc) => tc.toolName === "addExpense")
      .map((tc) => ({
        name: tc.args.name!,
        amount: tc.args.amount!,
        category: tc.args.category!,
        is_expense: tc.args.is_expense ?? true,
        spend_date: tc.args.spend_date ?? new Date().toISOString(),
      }));

    const toDelete = pendingToolCalls
      .filter((tc) => tc.toolName === "deleteExpense")
      .map((tc) => tc.args.id!);

    const [addResult, ...deleteResults] = await Promise.all([
      toAdd.length > 0 ? supabase.from("expense").insert(toAdd) : null,
      ...toDelete.map((id) => supabase.from("expense").delete().eq("id", id)),
    ]);

    const hasError =
      addResult?.error || deleteResults.some((r) => r?.error);

    if (hasError) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Some actions failed. Please try again." },
      ]);
    } else {
      const parts: string[] = [];
      if (toAdd.length > 0)
        parts.push(`${toAdd.length} expense${toAdd.length > 1 ? "s" : ""} saved`);
      if (toDelete.length > 0)
        parts.push(`${toDelete.length} expense${toDelete.length > 1 ? "s" : ""} deleted`);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Done! ${parts.join(" and ")}.` },
      ]);
    }

    setPendingToolCalls(null);
    setLoading(false);
  };

  const cancelAction = () => {
    setPendingToolCalls(null);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Cancelled. Anything else I can help with?" },
    ]);
  };

  const clearMessages = () => {
    setMessages([]);
    setPendingToolCalls(null);
    setSessionId(null);
  };

  return {
    messages,
    loading,
    pendingToolCalls,
    sendMessage,
    confirmAction,
    cancelAction,
    clearMessages,
  };
}
