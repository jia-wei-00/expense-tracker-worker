"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useAddLoan } from "@/hooks/useLoan";

const schema = z.object({
  name: z.string().min(1, "Loan name is required"),
  total_amount: z.coerce.number().positive("Amount must be positive"),
  interest_rate: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLoanDialog({ open, onOpenChange }: AddLoanDialogProps) {
  const { mutate: addLoan, isPending } = useAddLoan();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const onSubmit = (values: FormValues) => {
    addLoan(
      {
        name: values.name,
        total_amount: values.total_amount,
        interest_rate: values.interest_rate ?? null,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="loan-name">Loan Name</FieldLabel>
              <Input
                id="loan-name"
                placeholder="e.g. Car Loan, Personal Loan"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={!!errors.total_amount}>
              <FieldLabel htmlFor="total_amount">Total Amount (MYR)</FieldLabel>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                aria-invalid={!!errors.total_amount}
                {...register("total_amount")}
              />
              <FieldError errors={[errors.total_amount]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="interest_rate">Interest Rate (% p.a.) — optional</FieldLabel>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                placeholder="e.g. 3.5"
                {...register("interest_rate")}
              />
            </Field>
          </FieldGroup>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Spinner />}
              Add Loan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
