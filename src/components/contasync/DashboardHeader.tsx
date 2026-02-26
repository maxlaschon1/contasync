"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  notificationCount?: number;
  showSearch?: boolean;
  actions?: React.ReactNode;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DashboardHeader({
  title,
  subtitle,
  userName = "Utilizator",
  notificationCount = 0,
  showSearch = false,
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left — Title */}
        <div className="pl-10 lg:pl-0">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Right — Search, Notifications, User */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative max-md:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Caută..."
                className="pl-9 w-56 h-9 bg-muted/50 border-0 focus-visible:bg-card"
              />
            </div>
          )}

          {actions}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {notificationCount}
              </span>
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2 pr-3">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium max-md:hidden">
                  {userName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuItem>Setări</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Deconectare
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
