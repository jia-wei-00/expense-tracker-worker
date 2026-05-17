import dayjs from "dayjs";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Expense } from "@/hooks/useExpenses";

interface TransactionItemProps {
  expense: Expense;
  showLink?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export function TransactionItem({
  expense,
  showLink = false,
  selectable,
  selected,
  onSelect,
}: TransactionItemProps) {
  const isExpense = expense.is_expense ?? true;

  const inner = (
    <div className="flex items-center gap-3 py-2">
      {selectable && (
        <div
          className={cn(
            "size-5 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center",
            selected ? "bg-primary border-primary" : "border-muted-foreground/40",
          )}
        >
          {selected && <Check className="size-3 text-primary-foreground" />}
        </div>
      )}
      <div
        className={cn(
          "p-2 rounded-full shrink-0",
          isExpense ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
      >
        {isExpense ? (
          <ArrowDownCircle className="size-4" />
        ) : (
          <ArrowUpCircle className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{expense.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">
          {expense.category_name ?? "Uncategorized"} ·{" "}
          {dayjs(expense.spend_date).format("DD MMM YYYY")}
        </p>
      </div>
      <span
        className={cn(
          "text-sm font-semibold shrink-0",
          isExpense ? "text-destructive" : "text-primary",
        )}
      >
        {isExpense ? "-" : "+"}MYR {Number(expense.amount ?? 0).toFixed(2)}
      </span>
    </div>
  );

  if (selectable) {
    return (
      <button
        onClick={onSelect}
        className="w-full text-left hover:bg-accent rounded-lg px-1 transition-colors"
      >
        {inner}
      </button>
    );
  }

  if (showLink) {
    return (
      <Link
        href={`/dashboard/expenses/${expense.id}`}
        className="block hover:bg-accent rounded-lg px-1 transition-colors"
      >
        {inner}
      </Link>
    );
  }

  return <div className="px-1">{inner}</div>;
}
