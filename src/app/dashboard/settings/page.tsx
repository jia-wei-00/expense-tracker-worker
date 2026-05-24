"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import {
  useCategory,
  useAddCategory,
  useDeleteCategory,
} from "@/hooks/useCategory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, LogOut, User, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: categories = [], isLoading } = useCategory();

  const { mutate: addCategory, isPending: addingCategory } = useAddCategory();
  const { mutate: deleteCategory } = useDeleteCategory();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">(
    "expense",
  );
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [savedWhatsappNumber, setSavedWhatsappNumber] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("whatsapp_users")
      .select("phone_number, is_verified")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSavedWhatsappNumber(data.phone_number as string);
          setWhatsappNumber(data.phone_number as string);
          setIsVerified(data.is_verified as boolean);
        }
      });
  }, [user]);

  const handleSaveWhatsapp = async () => {
    if (!user) return;
    const normalized = whatsappNumber.replace(/\D/g, "");
    if (!normalized) return;

    setSavingWhatsapp(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/whatsapp/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phoneNumber: normalized }),
    });

    if (!res.ok) {
      toast.error("Failed to save WhatsApp number.");
    } else {
      setSavedWhatsappNumber(normalized);
      setWhatsappNumber(normalized);
      setIsVerified(false);
      toast.success("Verification message sent to your WhatsApp.");
    }
    setSavingWhatsapp(false);
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setSavingWhatsapp(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/whatsapp/resend-verification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      toast.error("Failed to resend verification.");
    } else {
      toast.success("Verification message resent to your WhatsApp.");
    }
    setSavingWhatsapp(false);
  };

  const handleRemoveWhatsapp = async () => {
    if (!user) return;
    setSavingWhatsapp(true);
    const { error } = await supabase.from("whatsapp_users").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Failed to remove WhatsApp number.");
    } else {
      setSavedWhatsappNumber(null);
      setWhatsappNumber("");
      toast.success("WhatsApp number removed.");
    }
    setSavingWhatsapp(false);
  };

  const expenseCategories = categories.filter((c) => c.is_expense);
  const incomeCategories = categories.filter((c) => !c.is_expense);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory(
      { name: newCategoryName.trim(), is_expense: categoryType === "expense" },
      { onSuccess: () => setNewCategoryName("") },
    );
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    toast.success("Signed out successfully.");
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Signed in as</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="size-4" />
            WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Link your WhatsApp number to add and view expenses via chat.
            Use the international format without the{" "}
            <code className="bg-muted px-1 rounded text-xs">+</code> sign
            (e.g. <code className="bg-muted px-1 rounded text-xs">60123456789</code>).
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="60123456789"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveWhatsapp(); }}
            />
            <Button
              onClick={handleSaveWhatsapp}
              disabled={savingWhatsapp || !whatsappNumber.trim()}
              size="sm"
            >
              {savingWhatsapp ? <Spinner /> : "Save"}
            </Button>
          </div>
          {savedWhatsappNumber && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-muted-foreground">
                    Linked: <span className="text-foreground font-medium">+{savedWhatsappNumber}</span>
                  </p>
                  {isVerified ? (
                    <Badge variant="secondary" className="w-fit text-xs text-green-600">Verified</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-fit text-xs text-yellow-600">Pending verification</Badge>
                      <button
                        onClick={handleResendVerification}
                        disabled={savingWhatsapp}
                        className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
                      >
                        Resend
                      </button>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemoveWhatsapp}
                  disabled={savingWhatsapp}
                >
                  <Trash2 className="size-3 mr-1" />
                  Remove
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Add category */}
          <div className="flex flex-col gap-3">
            <Tabs
              value={categoryType}
              onValueChange={(v) => setCategoryType(v as "expense" | "income")}
            >
              <TabsList>
                <TabsTrigger value="expense">Expense</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <Input
                placeholder={`New ${categoryType} category name`}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                }}
              />
              <Button
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                size="icon"
              >
                {addingCategory ? <Spinner /> : <Plus />}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Expense categories */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expense Categories
            </p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : expenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expense categories yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant="secondary"
                    className="gap-1.5 pl-2.5 pr-1.5 py-1 text-sm"
                  >
                    {cat.name}
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Income categories */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Income Categories
            </p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : incomeCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No income categories yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {incomeCategories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant="outline"
                    className="gap-1.5 pl-2.5 pr-1.5 py-1 text-sm"
                  >
                    {cat.name}
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logout dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut && <Spinner />}
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
