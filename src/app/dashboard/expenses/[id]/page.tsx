"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { ExpenseForm, type ExpenseFormValues } from "@/components/expenses/expense-form";
import { useInfiniteExpenses, useUpdateExpense, useDeleteExpense } from "@/hooks/useExpenses";

export default function ExpenseDetailPage(props: PageProps<"/dashboard/expenses/[id]">) {
  const params = use(props.params);
  const id = Number(params.id);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data } = useInfiniteExpenses();
  const expense = data?.pages.flat().find((e) => e.id === id);

  const { mutate: update, isPending: updating } = useUpdateExpense();
  const { mutate: deleteExp, isPending: deleting } = useDeleteExpense();

  if (!expense) {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const handleUpdate = (values: ExpenseFormValues) => {
    update(
      {
        id,
        name: values.name,
        amount: values.amount,
        category: values.category,
        is_expense: values.is_expense,
        spend_date: new Date(values.spend_date).toISOString(),
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleDelete = () => {
    deleteExp(
      { id, spend_date: expense.spend_date ?? new Date().toISOString() },
      { onSuccess: () => router.push("/dashboard/expenses") },
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ChevronLeft />
          </Button>
          <h1 className="text-xl font-bold">Transaction</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => setEditing(!editing)}>
            <Pencil />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
            <Trash2 />
          </Button>
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Edit Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              defaultValues={{
                name: expense.name ?? "",
                amount: expense.amount ?? 0,
                category: expense.category ?? 0,
                is_expense: expense.is_expense ?? true,
                spend_date: dayjs(expense.spend_date).format("YYYY-MM-DDTHH:mm"),
              }}
              onSubmit={handleUpdate}
              loading={updating}
              submitLabel="Save Changes"
            />
            <Button variant="ghost" className="w-full mt-2" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                MYR {Number(expense.amount ?? 0).toFixed(2)}
              </span>
              <Badge variant={expense.is_expense ? "destructive" : "default"}>
                {expense.is_expense ? "Expense" : "Income"}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{expense.name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{expense.category_name ?? "Uncategorized"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {dayjs(expense.spend_date).format("DD MMM YYYY, HH:mm")}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Added</span>
                <span className="font-medium">
                  {dayjs(expense.created_at).format("DD MMM YYYY")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{expense.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Spinner />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
