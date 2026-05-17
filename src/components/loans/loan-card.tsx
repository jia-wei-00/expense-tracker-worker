"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Loan } from "@/hooks/useLoan";
import { ChevronRight, Landmark } from "lucide-react";

interface LoanCardProps {
  loan: Loan;
}

export function LoanCard({ loan }: LoanCardProps) {
  const progress =
    loan.total_amount && loan.total_amount > 0
      ? (loan.paid_amount / loan.total_amount) * 100
      : 0;

  const isPaidOff = loan.remaining_amount <= 0;

  return (
    <Link href={`/dashboard/loans/${loan.id}`}>
      <Card className="hover:border-primary/40 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-xl">
                <Landmark className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">{loan.name}</p>
                {loan.interest_rate && (
                  <p className="text-xs text-muted-foreground">{loan.interest_rate}% p.a.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPaidOff && <Badge variant="default">Paid Off</Badge>}
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid: MYR {loan.paid_amount.toFixed(2)}</span>
              <span>Total: MYR {(loan.total_amount ?? 0).toFixed(2)}</span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <p className="text-xs font-medium text-right">
              Remaining:{" "}
              <span className={isPaidOff ? "text-primary" : "text-destructive"}>
                MYR {Math.max(loan.remaining_amount, 0).toFixed(2)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
