"use client";

import { useEffect } from "react";
import { useQueryClient, InfiniteData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import type { Expense } from "@/hooks/useExpenses";
import type { Category } from "@/hooks/useCategory";
import type { Tables } from "@/types/database.types";
import dayjs from "dayjs";

const EXPENSES_KEY = "expenses";
const MONTHLY_KEY = "monthly";
const CATEGORIES_KEY = "categories";

export function useExpenseSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const getCategoryName = (categoryId: number | null): string => {
      const categories = queryClient.getQueryData<Category[]>([CATEGORIES_KEY]);
      if (!categoryId || !categories) return "Uncategorized";
      return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
    };

    const channel = supabase
      .channel(`${user.id}_expense`)
      .on<Tables<"expense">>(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense" },
        (payload) => {
          const { eventType, new: expense, old } = payload;

          queryClient.setQueryData<InfiniteData<Expense[]>>(
            [EXPENSES_KEY],
            (oldData) => {
              if (!oldData) return oldData;

              switch (eventType) {
                case "INSERT": {
                  if (expense.spend_date) {
                    queryClient.invalidateQueries({
                      queryKey: [MONTHLY_KEY, dayjs(expense.spend_date).format("YYYY-MM")],
                    });
                  }
                  const newExpense: Expense = {
                    ...expense,
                    category_name: getCategoryName(expense.category),
                  };
                  const isDupe = oldData.pages.some((page) =>
                    page.some((e) => e.id === newExpense.id),
                  );
                  if (isDupe) return oldData;
                  return {
                    ...oldData,
                    pages: oldData.pages.map((page, i) =>
                      i === 0 ? [newExpense, ...page] : page,
                    ),
                  };
                }
                case "UPDATE": {
                  if (expense.spend_date) {
                    queryClient.invalidateQueries({
                      queryKey: [MONTHLY_KEY, dayjs(expense.spend_date).format("YYYY-MM")],
                    });
                  }
                  if (old.spend_date && old.spend_date !== expense.spend_date) {
                    queryClient.invalidateQueries({
                      queryKey: [MONTHLY_KEY, dayjs(old.spend_date).format("YYYY-MM")],
                    });
                  }
                  const updatedExpense: Expense = {
                    ...expense,
                    category_name: getCategoryName(expense.category),
                  };
                  return {
                    ...oldData,
                    pages: oldData.pages.map((page) =>
                      page.map((e) => (e.id === old.id ? updatedExpense : e)),
                    ),
                  };
                }
                case "DELETE": {
                  queryClient.invalidateQueries({
                    predicate: (query) => query.queryKey[0] === MONTHLY_KEY,
                  });
                  return {
                    ...oldData,
                    pages: oldData.pages.map((page) =>
                      page.filter((e) => e.id !== old.id),
                    ),
                  };
                }
                default:
                  return oldData;
              }
            },
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
