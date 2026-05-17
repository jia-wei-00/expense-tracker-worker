"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionItem } from "@/components/shared/transaction-item";
import { useInfiniteExpenses, useBulkDeleteExpenses } from "@/hooks/useExpenses";

export default function ExpensesPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteExpenses(20);
  const { mutate: bulkDelete, isPending: isDeleting } = useBulkDeleteExpenses();

  const allExpenses = data?.pages.flat() ?? [];
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const enterSelectMode = () => {
    setIsSelecting(true);
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  const toggleItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = allExpenses.length > 0 && selectedIds.size === allExpenses.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allExpenses.map((e) => e.id)));
    }
  };

  const handleBulkDelete = () => {
    bulkDelete([...selectedIds], {
      onSuccess: () => {
        setConfirmOpen(false);
        exitSelectMode();
      },
    });
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        {isSelecting ? (
          <>
            <Button variant="ghost" size="sm" onClick={exitSelectMode}>
              Cancel
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {allSelected ? "None" : "All"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 />
                Delete ({selectedIds.size})
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <div className="flex items-center gap-2">
              {allExpenses.length > 0 && (
                <Button variant="outline" size="sm" onClick={enterSelectMode}>
                  Select
                </Button>
              )}
              <Button asChild size="sm">
                <Link href="/dashboard/expenses/add">
                  <Plus />
                  Add
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4">
                <Skeleton className="h-14 my-2" />
              </div>
            ))
          ) : allExpenses.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="p-3 bg-muted rounded-full">
                <CreditCard className="size-6 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-sm">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Start tracking your finances by adding your first transaction.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/dashboard/expenses/add">
                  <Plus />
                  Add Transaction
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {allExpenses.map((expense) =>
                isSelecting ? (
                  <TransactionItem
                    key={expense.id}
                    expense={expense}
                    selectable
                    selected={selectedIds.has(expense.id)}
                    onSelect={() => toggleItem(expense.id)}
                  />
                ) : (
                  <TransactionItem key={expense.id} expense={expense} showLink />
                ),
              )}
              <div ref={loadMoreRef} className="py-2 flex justify-center">
                {isFetchingNextPage && <Spinner />}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} expense{selectedIds.size !== 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting && <Spinner />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
