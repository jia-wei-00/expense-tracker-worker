"use client";

import { useExpenseSubscription } from "@/hooks/useExpenseSubscription";

export function ExpenseRealtimeSync() {
  useExpenseSubscription();
  return null;
}
