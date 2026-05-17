import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/sidebar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ExpenseRealtimeSync } from "@/components/shared/expense-realtime-sync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ExpenseRealtimeSync />
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <ThemeToggle />
        </header>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
