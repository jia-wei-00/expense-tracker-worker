"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, CreditCard, Bot, Settings, Wallet, LogOut, Landmark } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/expenses", label: "Expenses", icon: CreditCard },
  { href: "/dashboard/loans", label: "Loans", icon: Landmark },
  { href: "/dashboard/agent", label: "AI Agent", icon: Bot },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out.");
    router.push("/login");
    router.refresh();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Expense Tracker">
              <Link href="/dashboard">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wallet />
                </div>
                <span className="truncate font-bold">Expense Tracker</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={active} tooltip={label}>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sign Out">
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
