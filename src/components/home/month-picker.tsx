"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [viewing, setViewing] = useState(dayjs(value));

  const prevMonth = () => {
    const next = viewing.subtract(1, "month");
    setViewing(next);
    onChange(next.toDate());
  };

  const nextMonth = () => {
    const next = viewing.add(1, "month");
    setViewing(next);
    onChange(next.toDate());
  };

  return (
    <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-2">
      <Button variant="ghost" size="icon" onClick={prevMonth}>
        <ChevronLeft />
      </Button>
      <span className="font-semibold text-sm">{viewing.format("MMMM YYYY")}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={nextMonth}
        disabled={viewing.isSame(dayjs(), "month")}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
