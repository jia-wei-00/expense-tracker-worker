"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ExpenseForm, type ExpenseFormValues } from "@/components/expenses/expense-form";
import { useAddExpense } from "@/hooks/useExpenses";

export default function AddExpensePage() {
  const router = useRouter();
  const { mutate: addExpense, isPending } = useAddExpense();

  const handleSubmit = (values: ExpenseFormValues) => {
    addExpense(
      {
        name: values.name,
        amount: values.amount,
        category: values.category,
        is_expense: values.is_expense,
        spend_date: new Date(values.spend_date).toISOString(),
      },
      {
        onSuccess: () => router.push("/dashboard/expenses"),
      },
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ChevronLeft />
        </Button>
        <h1 className="text-xl font-bold">Add Transaction</h1>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm onSubmit={handleSubmit} loading={isPending} submitLabel="Add Transaction" />
        </CardContent>
      </Card>
    </div>
  );
}
