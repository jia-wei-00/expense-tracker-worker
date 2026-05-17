"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useAgent";
import { Bot, User } from "lucide-react";

type ChatBubbleProps = Pick<ChatMessage, "role" | "content" | "isLoading">;

export function ChatBubble({ role, content, isLoading }: ChatBubbleProps) {
  const isAssistant = role === "assistant";

  return (
    <div className={cn("flex gap-2.5", isAssistant ? "justify-start" : "justify-end")}>
      {isAssistant && (
        <div className="shrink-0 p-1.5 bg-primary/10 rounded-full h-7 w-7 flex items-center justify-center mt-1">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isAssistant
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm",
        )}
      >
        {isLoading ? (
          <div className="flex gap-1 items-center h-5">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        )}
      </div>
      {!isAssistant && (
        <div className="shrink-0 p-1.5 bg-primary rounded-full h-7 w-7 flex items-center justify-center mt-1">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
