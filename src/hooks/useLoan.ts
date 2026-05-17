"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/types/database.types";
import { toast } from "sonner";

export type Loan = Tables<"loan"> & {
  paid_amount: number;
  remaining_amount: number;
};
export type LoanRecord = Tables<"loan_record">;

const LOANS_KEY = "loans";
const LOAN_RECORDS_KEY = "loan_records";

export function useLoans() {
  return useQuery({
    queryKey: [LOANS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan")
        .select("*, loan_record(amount)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((loan) => {
        const paid_amount = (loan.loan_record ?? []).reduce(
          (sum, r) => sum + parseFloat(r.amount ?? "0"),
          0,
        );
        const remaining_amount = (loan.total_amount ?? 0) - paid_amount;
        const { loan_record: _records, ...rest } = loan;
        return { ...rest, paid_amount, remaining_amount } as Loan;
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loan: TablesInsert<"loan">) => {
      const { data, error } = await supabase.from("loan").insert(loan).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOANS_KEY] });
      toast.success("Loan added.");
    },
    onError: () => toast.error("Failed to add loan."),
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tables<"loan">> & { id: number }) => {
      const { error } = await supabase.from("loan").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOANS_KEY] });
      toast.success("Loan updated.");
    },
    onError: () => toast.error("Failed to update loan."),
  });
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("loan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOANS_KEY] });
      toast.success("Loan deleted.");
    },
    onError: () => toast.error("Failed to delete loan."),
  });
}

export function useLoanRecords(loanId: number) {
  return useQuery({
    queryKey: [LOAN_RECORDS_KEY, loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_record")
        .select("*")
        .eq("loan", loanId)
        .order("pay_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!loanId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddLoanRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: TablesInsert<"loan_record">) => {
      const { data, error } = await supabase
        .from("loan_record")
        .insert(record)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, record) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_RECORDS_KEY, record.loan] });
      queryClient.invalidateQueries({ queryKey: [LOANS_KEY] });
      toast.success("Payment recorded.");
    },
    onError: () => toast.error("Failed to record payment."),
  });
}

export function useDeleteLoanRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, loanId }: { id: number; loanId: number }) => {
      const { error } = await supabase.from("loan_record").delete().eq("id", id);
      if (error) throw error;
      return loanId;
    },
    onSuccess: (loanId) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_RECORDS_KEY, loanId] });
      queryClient.invalidateQueries({ queryKey: [LOANS_KEY] });
      toast.success("Payment deleted.");
    },
    onError: () => toast.error("Failed to delete payment."),
  });
}
