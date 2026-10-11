import { Wallet } from "lucide-react";

export function AuthShell({
  subtitle,
  children,
}: {
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-primary rounded-2xl">
            <Wallet className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Expense Tracker</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground text-center">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
