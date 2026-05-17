"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoanCard } from "@/components/loans/loan-card";
import { AddLoanDialog } from "@/components/loans/add-loan-dialog";
import { useLoans } from "@/hooks/useLoan";
import { Landmark, Plus } from "lucide-react";

export default function LoansPage() {
  const { data: loans = [], isLoading } = useLoans();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          Add Loan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="p-3 bg-muted rounded-full">
            <Landmark className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-sm">No loans yet</p>
            <p className="text-sm text-muted-foreground">
              Track your loans and monitor repayment progress.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus />
            Add your first loan
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
      )}

      <AddLoanDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
