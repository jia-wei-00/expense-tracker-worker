"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlySummary } from "@/hooks/useExpenses";

const COLORS = [
  "#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

interface ExpenseChartProps {
  type: "expense" | "income";
  data: MonthlySummary | undefined;
}

export function ExpenseChart({ type, data }: ExpenseChartProps) {
  const { chartData, total } = useMemo(() => {
    if (!data?.[type]) return { chartData: [], total: 0 };

    const grouped = data[type].reduce<Record<string, number>>((acc, curr) => {
      const [cat, amt] = Object.entries(curr)[0];
      acc[cat] = (acc[cat] ?? 0) + amt;
      return acc;
    }, {});

    let running = 0;
    const mapped = Object.entries(grouped)
      .map(([name, value]) => {
        running += value;
        return { name, value };
      })
      .sort((a, b) => b.value - a.value);

    return { chartData: mapped, total: running };
  }, [data, type]);

  const title = type === "expense" ? "Expenses by Category" : "Income by Category";

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No {type === "expense" ? "expense" : "income"} data this month
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">MYR {total.toFixed(2)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`MYR ${Number(value).toFixed(2)}`, ""]}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
