"use client";

import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, AlertCircle } from "lucide-react";
import type { PendingToolCall } from "@/hooks/useAgent";
import type { Category } from "@/hooks/useCategory";

interface PendingActionPanelProps {
  pendingToolCalls: PendingToolCall[];
  categories: Category[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PendingActionPanel({
  pendingToolCalls,
  categories,
  onConfirm,
  onCancel,
}: PendingActionPanelProps) {
  const getCategoryName = (id?: number) => {
    if (!id) return "Unknown";
    return categories.find((c) => c.id === id)?.name ?? "Unknown";
  };

  return (
    <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertCircle className="size-4 text-yellow-600" />
          Confirm Action
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {pendingToolCalls.map((tc, i) => (
          <div key={i} className="text-sm bg-background rounded-lg p-3 flex flex-col gap-1 border">
            <div className="flex items-center gap-2">
              <Badge variant={tc.toolName === "deleteExpense" ? "destructive" : "default"} className="text-xs">
                {tc.toolName === "addExpense" ? "Add" : "Delete"}
              </Badge>
              {tc.toolName === "addExpense" && (
                <span className="font-medium">{tc.args.name}</span>
              )}
              {tc.toolName === "deleteExpense" && (
                <span className="text-muted-foreground">Expense ID: {tc.args.id}</span>
              )}
            </div>
            {tc.toolName === "addExpense" && (
              <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                <span>Amount: MYR {tc.args.amount?.toFixed(2)}</span>
                <span>Type: {tc.args.is_expense ? "Expense" : "Income"}</span>
                <span>Category: {getCategoryName(tc.args.category)}</span>
                <span>Date: {dayjs(tc.args.spend_date).format("DD MMM YYYY")}</span>
              </div>
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onCancel} className="flex-1">
            <X />
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} className="flex-1">
            <Check />
            Confirm
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
