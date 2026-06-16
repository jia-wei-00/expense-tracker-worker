"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MonthlySummary } from "@/hooks/useExpenses";
import dayjs from "dayjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AiAnalyticsProps {
  month: Date;
  data: MonthlySummary | undefined;
}

export function AiAnalytics({ month, data }: AiAnalyticsProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateSummary = async () => {
    if (!data) return;
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      if (!workerUrl) throw new Error("Worker URL not configured");

      const expenseGroups = data.expense.reduce<Record<string, number>>((acc, curr) => {
        const [cat, amt] = Object.entries(curr)[0];
        acc[cat] = (acc[cat] ?? 0) + amt;
        return acc;
      }, {});

      const incomeGroups = data.income.reduce<Record<string, number>>((acc, curr) => {
        const [cat, amt] = Object.entries(curr)[0];
        acc[cat] = (acc[cat] ?? 0) + amt;
        return acc;
      }, {});

      const totalExpense = Object.values(expenseGroups).reduce((a, b) => a + b, 0);
      const totalIncome = Object.values(incomeGroups).reduce((a, b) => a + b, 0);

      const prompt = `Analyze my expense data for ${dayjs(month).format("MMMM YYYY")} and give me 3-4 specific, actionable tips to optimize spending and save money.

My expenses this month (MYR):
${Object.entries(expenseGroups).map(([cat, amt]) => `- ${cat}: MYR ${amt.toFixed(2)}`).join("\n")}
Total expenses: MYR ${totalExpense.toFixed(2)}

My income this month (MYR):
${Object.entries(incomeGroups).map(([cat, amt]) => `- ${cat}: MYR ${amt.toFixed(2)}`).join("\n")}
Total income: MYR ${totalIncome.toFixed(2)}

Savings rate: ${totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0}%

Be concise, specific, and encouraging. Focus on the largest expense categories.`;

      const res = await fetch(`${workerUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message: prompt,
          analyticsMode: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to get analysis");
      const result = await res.json();
      setSummary(result.message ?? "Unable to generate analysis.");
      setGenerated(true);
    } catch {
      setSummary("Unable to generate analysis. Please ensure the AI worker is configured.");
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const hasData = data && (data.expense.length > 0 || data.income.length > 0);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Bot className="size-4 text-primary" />
          </div>
          AI Spending Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!generated && !loading && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Get AI-powered insights on how to optimize your spending and save more money this month.
            </p>
            <Button
              onClick={generateSummary}
              disabled={!hasData}
              size="sm"
            >
              <Sparkles />
              {hasData ? "Analyze My Spending" : "No data for this month"}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {generated && !loading && (
          <div className="flex flex-col gap-3">
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground
              [&>h1]:text-base [&>h1]:font-semibold [&>h1]:mb-2
              [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mb-1.5
              [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1
              [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-2
              [&>ul]:text-sm [&>ul]:leading-relaxed [&>ul]:pl-4 [&>ul]:mb-2
              [&>ol]:text-sm [&>ol]:leading-relaxed [&>ol]:pl-4 [&>ol]:mb-2
              [&>ul>li]:mb-1 [&>ol>li]:mb-1
              [&>*:last-child]:mb-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGenerated(false);
                setSummary("");
                generateSummary();
              }}
              className="text-muted-foreground self-start"
            >
              <RefreshCw />
              Refresh analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
