"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthShell } from "@/components/auth/auth-shell";
import { CheckCircle, XCircle } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";

// Only allow same-origin relative paths to prevent open redirects.
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

const SUCCESS_COPY: Record<string, { title: string; body: string }> = {
  "/reset-password": {
    title: "Link verified!",
    body: "Redirecting you to set a new password…",
  },
  default: {
    title: "You're signed in!",
    body: "Redirecting to your dashboard…",
  },
};

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const next = safeNext(searchParams.get("next"));

  useEffect(() => {
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const code = searchParams.get("code");
    const errorDescription = searchParams.get("error_description");

    const fail = (msg: string) => {
      setStatus("error");
      setMessage(msg);
    };
    const succeed = () => {
      setStatus("success");
      setTimeout(() => router.replace(next), 1500);
    };

    // Supabase redirects back with error params when a link is expired/used.
    if (errorDescription) {
      fail(errorDescription);
      return;
    }

    // Custom email templates: /auth/confirm?token_hash=...&type=...
    if (token_hash && type) {
      supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
        if (error) fail(error.message);
        else succeed();
      });
      return;
    }

    // Default templates (PKCE): Supabase redirects with ?code=..., which the
    // browser client exchanges automatically on init. Wait for that, then check.
    if (code) {
      supabase.auth.initialize().then(async ({ error }) => {
        if (error) return fail(error.message);
        const { data } = await supabase.auth.getSession();
        if (data.session) succeed();
        else
          fail(
            "This link is invalid or has expired. Make sure you open it in the same browser you requested it from.",
          );
      });
      return;
    }

    fail("Invalid confirmation link.");
  }, [searchParams, router, next]);

  const copy =
    searchParams.get("type") === "signup"
      ? { title: "Email confirmed!", body: "Redirecting to your dashboard…" }
      : (SUCCESS_COPY[next] ?? SUCCESS_COPY.default);

  return (
    <AuthShell>
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
          {status === "loading" && (
            <>
              <Spinner className="size-8" />
              <p className="text-sm text-muted-foreground">Verifying your link…</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="size-10 text-primary" />
              <div className="flex flex-col gap-1">
                <p className="font-semibold">{copy.title}</p>
                <p className="text-sm text-muted-foreground">{copy.body}</p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="size-10 text-destructive" />
              <div className="flex flex-col gap-1">
                <p className="font-semibold">Verification failed</p>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(next === "/reset-password" ? "/forgot-password" : "/login")
                }
              >
                {next === "/reset-password" ? "Request New Link" : "Back to Sign In"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </AuthShell>
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
