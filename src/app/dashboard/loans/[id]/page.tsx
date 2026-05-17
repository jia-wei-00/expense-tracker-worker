"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { useLoans, useLoanRecords, useAddLoanRecord, useDeleteLoanRecord, useDeleteLoan } from "@/hooks/useLoan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  pay_date: z.string().min(1, "Date is required"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function LoanDetailPage(props: PageProps<"/dashboard/loans/[id]">) {
  const params = use(props.params);
  const id = Number(params.id);
  const router = useRouter();
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: loans = [], isLoading: loansLoading } = useLoans();
  const loan = loans.find((l) => l.id === id);

  const { data: records = [], isLoading: recordsLoading } = useLoanRecords(id);
  const { mutate: addRecord, isPending: addingRecord } = useAddLoanRecord();
  const { mutate: deleteRecord } = useDeleteLoanRecord();
  const { mutate: deleteLoan, isPending: deletingLoan } = useDeleteLoan();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as Resolver<PaymentFormValues>,
    defaultValues: { pay_date: dayjs().format("YYYY-MM-DDTHH:mm") },
  });

  if (loansLoading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">Loan not found.</p>
        <Button variant="link" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const progress = loan.total_amount && loan.total_amount > 0
    ? (loan.paid_amount / loan.total_amount) * 100
    : 0;

  const isPaidOff = loan.remaining_amount <= 0;

  const handleAddPayment = (values: PaymentFormValues) => {
    addRecord(
      {
        loan: id,
        amount: values.amount.toString(),
        pay_date: new Date(values.pay_date).toISOString(),
      },
      {
        onSuccess: () => {
          reset({ pay_date: dayjs().format("YYYY-MM-DDTHH:mm") });
          setAddPaymentOpen(false);
        },
      },
    );
  };

  const handleDeleteLoan = () => {
    deleteLoan(id, {
      onSuccess: () => router.push("/dashboard/loans"),
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ChevronLeft />
          </Button>
          <h1 className="text-xl font-bold">{loan.name}</h1>
        </div>
        <Button variant="outline" size="icon-sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <Trash2 />
        </Button>
      </div>

      {/* Loan Summary */}
      <Card>
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">MYR {(loan.total_amount ?? 0).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total loan amount</p>
            </div>
            {isPaidOff && <Badge>Paid Off</Badge>}
          </div>

          {loan.interest_rate && (
            <p className="text-sm text-muted-foreground">Interest: {loan.interest_rate}% p.a.</p>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid: MYR {loan.paid_amount.toFixed(2)}</span>
              <span>Remaining: MYR {Math.max(loan.remaining_amount, 0).toFixed(2)}</span>
            </div>
            <Progress value={Math.min(progress, 100)} />
            <p className="text-xs text-right text-muted-foreground">{Math.min(progress, 100).toFixed(1)}% paid</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Records */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment History</CardTitle>
          <Button size="sm" onClick={() => setAddPaymentOpen(true)}>
            <Plus />
            Add Payment
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recordsLoading ? (
            <div className="p-4 flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payments recorded yet.
            </p>
          ) : (
            <div className="divide-y">
              {records.map((record) => (
                <div key={record.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-semibold text-sm">
                      MYR {parseFloat(record.amount ?? "0").toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(record.pay_date).format("DD MMM YYYY")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteRecord({ id: record.id, loanId: id })}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAddPayment)} className="flex flex-col gap-4">
            <FieldGroup>
              <Field data-invalid={!!errors.amount}>
                <FieldLabel>Amount (MYR)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  aria-invalid={!!errors.amount}
                  {...register("amount")}
                />
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field data-invalid={!!errors.pay_date}>
                <FieldLabel>Payment Date</FieldLabel>
                <Input
                  type="datetime-local"
                  aria-invalid={!!errors.pay_date}
                  {...register("pay_date")}
                />
                <FieldError errors={[errors.pay_date]} />
              </Field>
            </FieldGroup>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={addingRecord}>
                {addingRecord && <Spinner />}
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Loan Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Loan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{loan.name}&rdquo;? This will also delete all payment records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLoan} disabled={deletingLoan}>
              {deletingLoan && <Spinner />}
              Delete Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
