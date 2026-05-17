export function normalizeAddExpenseArgs(args: Record<string, unknown>) {
  return {
    name: String(args.name ?? ""),
    amount: Number(args.amount ?? 0),
    category: Number(args.category_id ?? args.category ?? 0),
    is_expense: args.is_expense !== false,
    spend_date: String(args.spend_date ?? new Date().toISOString()),
  };
}
