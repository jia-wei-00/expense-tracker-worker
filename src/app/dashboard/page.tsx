"use client";

import { useState } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthPicker } from "@/components/home/month-picker";
import { ExpenseChart } from "@/components/home/expense-chart";
import { AiAnalytics } from "@/components/home/ai-analytics";
import { TransactionItem } from "@/components/shared/transaction-item";
import { useFetchMonthlyExpenses, useInfiniteExpenses } from "@/hooks/useExpenses";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(dayjs().toDate());
  const { user } = useAuth();

  const { data: monthlyData, isLoading: monthlyLoading } = useFetchMonthlyExpenses(selectedMonth);
  const { data: infiniteData, isLoading: expensesLoading } = useInfiniteExpenses(5);

  const recentExpenses = infiniteData?.pages.flat().slice(0, 5) ?? [];

  const totalExpense = monthlyData?.expense.reduce((sum, e) => {
    const amt = Object.values(e)[0];
    return sum + amt;
  }, 0) ?? 0;

  const totalIncome = monthlyData?.income.reduce((sum, e) => {
    const amt = Object.values(e)[0];
    return sum + amt;
  }, 0) ?? 0;

  const balance = totalIncome - totalExpense;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hello, {user?.email?.split("@")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s your financial overview</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/expenses/add">
            <Plus />
            Add
          </Link>
        </Button>
      </div>

      <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Income</p>
            {monthlyLoading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <p className="text-lg font-bold text-primary">
                MYR {totalIncome.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Expenses</p>
            {monthlyLoading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <p className="text-lg font-bold text-destructive">
                MYR {totalExpense.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Balance</p>
            {monthlyLoading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <p className={`text-lg font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                MYR {balance.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {monthlyLoading ? (
          <>
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </>
        ) : (
          <>
            <ExpenseChart type="expense" data={monthlyData} />
            <ExpenseChart type="income" data={monthlyData} />
          </>
        )}
      </div>

      {/* AI Analytics */}
      <AiAnalytics month={selectedMonth} data={monthlyData} />

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/dashboard/expenses">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="divide-y">
          {expensesLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 my-2" />
            ))
          ) : recentExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet. Add your first expense!
            </p>
          ) : (
            recentExpenses.map((expense) => (
              <TransactionItem key={expense.id} expense={expense} showLink />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
