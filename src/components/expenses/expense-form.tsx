"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useCategory } from "@/hooks/useCategory";
import type { Expense } from "@/hooks/useExpenses";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.coerce.number().min(1, "Category is required"),
  is_expense: z.boolean(),
  spend_date: z.string().min(1, "Date is required"),
});

export type ExpenseFormValues = z.infer<typeof schema>;

interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseFormValues) => void;
  loading?: boolean;
  submitLabel?: string;
}

export function ExpenseForm({
  defaultValues,
  onSubmit,
  loading,
  submitLabel = "Save",
}: ExpenseFormProps) {
  const { data: categories = [] } = useCategory();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema) as Resolver<ExpenseFormValues>,
    defaultValues: {
      name: "",
      amount: undefined,
      is_expense: true,
      spend_date: dayjs().format("YYYY-MM-DDTHH:mm"),
      ...defaultValues,
    },
  });

  const isExpense = watch("is_expense");
  const filteredCategories = categories.filter((c) => c.is_expense === isExpense);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Field>
        <FieldLabel>Type</FieldLabel>
        <Tabs
          value={isExpense ? "expense" : "income"}
          onValueChange={(v) => {
            setValue("is_expense", v === "expense");
            setValue("category", 0 as unknown as number);
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="expense" className="flex-1">Expense</TabsTrigger>
            <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
          </TabsList>
        </Tabs>
      </Field>

      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            placeholder="e.g. Coffee, Salary"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.amount}>
          <FieldLabel htmlFor="amount">Amount (MYR)</FieldLabel>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            aria-invalid={!!errors.amount}
            {...register("amount")}
          />
          <FieldError errors={[errors.amount]} />
        </Field>

        <Field data-invalid={!!errors.category}>
          <FieldLabel>Category</FieldLabel>
          <Select
            onValueChange={(v) => setValue("category", Number(v))}
            defaultValue={defaultValues?.category?.toString()}
          >
            <SelectTrigger aria-invalid={!!errors.category} className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {filteredCategories.length === 0 ? (
                  <SelectItem value="0" disabled>
                    No categories — add one in Settings
                  </SelectItem>
                ) : (
                  filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={[errors.category]} />
        </Field>

        <Field data-invalid={!!errors.spend_date}>
          <FieldLabel htmlFor="spend_date">Date</FieldLabel>
          <Input
            id="spend_date"
            type="datetime-local"
            aria-invalid={!!errors.spend_date}
            {...register("spend_date")}
          />
          <FieldError errors={[errors.spend_date]} />
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Spinner />}
        {submitLabel}
      </Button>
    </form>
  );
}
