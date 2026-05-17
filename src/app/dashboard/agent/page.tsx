"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatBubble } from "@/components/agent/chat-bubble";
import { PendingActionPanel } from "@/components/agent/pending-action-panel";
import { useAgent } from "@/hooks/useAgent";
import { useCategory } from "@/hooks/useCategory";
import { Bot, Send, Trash2 } from "lucide-react";

export default function AgentPage() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, loading, pendingToolCalls, sendMessage, confirmAction, cancelAction, clearMessages } =
    useAgent();
  const { data: categories = [] } = useCategory();

  const displayMessages = loading
    ? [...messages, { role: "assistant" as const, content: "", isLoading: true }]
    : messages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  }, [input, loading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Bot className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">AI Agent</h1>
            <p className="text-xs text-muted-foreground">Ask about your expenses or add new ones</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clearMessages}
            disabled={loading}
            className="text-muted-foreground"
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-4">
        {displayMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-primary/5 rounded-2xl mb-4">
              <Bot className="size-10 text-primary" />
            </div>
            <h2 className="font-semibold text-lg mb-1">Your AI Finance Assistant</h2>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Ask me to add expenses, list transactions, or summarize your spending. I&apos;ll ask for
              confirmation before making any changes.
            </p>
            <div className="mt-6 flex flex-col gap-2 w-full max-w-sm">
              {[
                "Add RM15 coffee expense today",
                "What did I spend last week?",
                "Summarize my expenses this month",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="text-sm text-left px-4 py-2.5 rounded-xl border hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          displayMessages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} isLoading={msg.isLoading} />
          ))
        )}

        {pendingToolCalls && (
          <PendingActionPanel
            pendingToolCalls={pendingToolCalls}
            categories={categories}
            onConfirm={confirmAction}
            onCancel={cancelAction}
          />
        )}
      </div>

      {/* Input */}
      <div className="border-t px-4 md:px-6 py-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about expenses or add new ones..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
}
