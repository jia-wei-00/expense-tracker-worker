"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/types/database.types";
import { toast } from "sonner";

export type Category = Tables<"expense_category">;

const CATEGORIES_KEY = "categories";

export function useCategory() {
  return useQuery({
    queryKey: [CATEGORIES_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_category")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useAddCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: TablesInsert<"expense_category">) => {
      const { data, error } = await supabase
        .from("expense_category")
        .insert(category)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
      toast.success("Category added.");
    },
    onError: () => toast.error("Failed to add category."),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("expense_category")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
      toast.success("Category deleted.");
    },
    onError: () => toast.error("Failed to delete category."),
  });
}
