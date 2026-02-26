"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Upload,
  Bell,
  Settings,
  Calculator,
  BarChart3,
  LogOut,
  ChevronLeft,
  Menu,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface SidebarProps {
  variant: "admin" | "client";
  userName?: string;
  companyName?: string;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Firme", href: "/admin/companies", icon: Building2 },
  { label: "Rapoarte", href: "/admin/reports", icon: BarChart3 },
  { label: "Setări", href: "/admin/settings", icon: Settings },
];

const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Încarcă documente", href: "/dashboard/upload", icon: Upload },
  { label: "Facturi", href: "/dashboard/invoices", icon: FileText },
  { label: "Istoric", href: "/dashboard/history", icon: History },
  { label: "Notificări", href: "/dashboard/notifications", icon: Bell },
  { label: "Setări", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ variant, userName, companyName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = variant === "admin" ? adminNav : clientNav;

  const isActive = (href: string) => {
    if (href === "/admin" || href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
          CS
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-white tracking-tight">
            ContaSync
          </span>
        )}
      </div>

      {/* User / Company */}
      {!collapsed && (userName || companyName) && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          {userName && (
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
              {userName}
            </p>
          )}
          {companyName && (
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {companyName}
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.badge && item.badge > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full">
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>Deconectare</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="size-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-dvh bg-sidebar transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen
            ? "translate-x-0"
            : "max-lg:-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 size-6 rounded-full border bg-card shadow-sm flex items-center justify-center max-lg:hidden hover:bg-muted transition-colors"
        >
          <ChevronLeft
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </aside>

      {/* Spacer */}
      <div
        className={cn(
          "shrink-0 max-lg:hidden transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64"
        )}
      />
    </>
  );
}
