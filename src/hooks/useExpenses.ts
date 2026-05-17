"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import dayjs from "dayjs";
import { toast } from "sonner";

export type Expense = Tables<"expense"> & { category_name?: string | null };

export type MonthlySummaryEntry = { [category: string]: number };
export type MonthlySummary = {
  expense: MonthlySummaryEntry[];
  income: MonthlySummaryEntry[];
};

const EXPENSES_KEY = "expenses";
const MONTHLY_KEY = "monthly";

export function useFetchMonthlyExpenses(month: Date) {
  const monthKey = dayjs(month).format("YYYY-MM");

  return useQuery({
    queryKey: [MONTHLY_KEY, monthKey],
    queryFn: async () => {
      const startOfMonth = dayjs(month).startOf("month").toISOString();
      const startOfNextMonth = dayjs(month).add(1, "month").startOf("month").toISOString();

      const { data, error } = await supabase
        .from("expense")
        .select("amount, is_expense, expense_category(name)")
        .gte("spend_date", startOfMonth)
        .lt("spend_date", startOfNextMonth);

      if (error) throw error;

      const result: MonthlySummary = { expense: [], income: [] };

      for (const row of data ?? []) {
        const categoryName = String((row.expense_category as { name: string } | null)?.name ?? "Uncategorized");
        const entry = { [categoryName]: Number(row.amount) };
        if (row.is_expense) {
          result.expense.push(entry);
        } else {
          result.income.push(entry);
        }
      }

      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useInfiniteExpenses(limit = 15) {
  return useInfiniteQuery({
    queryKey: [EXPENSES_KEY],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from("expense")
        .select("*, expense_category(name)")
        .order("spend_date", { ascending: false })
        .range((pageParam as number) * limit, ((pageParam as number) + 1) * limit - 1);

      if (error) throw error;

      return (data ?? []).map((e) => ({
        ...e,
        category_name: (e.expense_category as { name: string } | null)?.name ?? null,
      }));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < limit) return undefined;
      return allPages.length;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: TablesInsert<"expense">) => {
      const { data, error } = await supabase.from("expense").insert(expense).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
      if (data?.[0]?.spend_date) {
        const monthKey = dayjs(data[0].spend_date).format("YYYY-MM");
        queryClient.invalidateQueries({ queryKey: [MONTHLY_KEY, monthKey] });
      }
      toast.success("Expense saved.");
    },
    onError: () => toast.error("Failed to save expense."),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"expense"> & { id: number }) => {
      const { data, error } = await supabase
        .from("expense")
        .update(updates)
        .eq("id", id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
      if (data?.[0]?.spend_date) {
        const monthKey = dayjs(data[0].spend_date).format("YYYY-MM");
        queryClient.invalidateQueries({ queryKey: [MONTHLY_KEY, monthKey] });
      }
      toast.success("Expense updated.");
    },
    onError: () => toast.error("Failed to update expense."),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, spend_date }: { id: number; spend_date: string }) => {
      const { error } = await supabase.from("expense").delete().eq("id", id);
      if (error) throw error;
      return spend_date;
    },
    onSuccess: (spend_date) => {
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
      const monthKey = dayjs(spend_date).format("YYYY-MM");
      queryClient.invalidateQueries({ queryKey: [MONTHLY_KEY, monthKey] });
      toast.success("Expense deleted.");
    },
    onError: () => toast.error("Failed to delete expense."),
  });
}

export function useBulkDeleteExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { error } = await supabase.from("expense").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSES_KEY] });
      queryClient.invalidateQueries({ queryKey: [MONTHLY_KEY] });
      toast.success("Expenses deleted.");
    },
    onError: () => toast.error("Failed to delete expenses."),
  });
}
