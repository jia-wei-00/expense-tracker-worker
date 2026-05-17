"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Wallet, MailCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setConfirmSent(true);
    }
    setLoading(false);
  };

  if (confirmSent) {
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
              <div className="p-3 bg-primary/10 rounded-full">
                <MailCheck className="size-8 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-lg">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Click it to activate your account.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setConfirmSent(false)}
              >
                Use a different email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-primary rounded-2xl">
            <Wallet className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Expense Tracker</h1>
          <p className="text-sm text-muted-foreground text-center">
            Track expenses, loans, and get AI insights
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Welcome</CardTitle>
            <CardDescription>Sign in or create a new account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email-signin">Email</Label>
                      <Input
                        id="email-signin"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="password-signin">Password</Label>
                      <Input
                        id="password-signin"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Spinner />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email-signup">Email</Label>
                      <Input
                        id="email-signup"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="password-signup">Password</Label>
                      <Input
                        id="password-signup"
                        type="password"
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Spinner />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
