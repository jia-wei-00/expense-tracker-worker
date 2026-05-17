"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle, Wallet } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;

    if (!token_hash || !type) {
      setStatus("error");
      setMessage("Invalid confirmation link.");
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash, type })
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
        } else {
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-primary rounded-2xl">
            <Wallet className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Expense Tracker</h1>
        </div>

        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
            {status === "loading" && (
              <>
                <Spinner className="size-8" />
                <p className="text-sm text-muted-foreground">Confirming your email…</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="size-10 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">Email confirmed!</p>
                  <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="size-10 text-destructive" />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">Confirmation failed</p>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
                  Back to Sign In
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="size-8" />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
