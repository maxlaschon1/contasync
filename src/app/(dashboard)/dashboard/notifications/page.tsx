"use client";

import { useState, useEffect, useTransition } from "react";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  Receipt,
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  getNotifications,
  markAsRead as markAsReadAction,
  markAllAsRead,
} from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import type { LucideIcon } from "lucide-react";

const typeConfig: Record<string, { icon: LucideIcon; color: string }> = {
  missing_statement: { icon: FileText, color: "text-red-500" },
  missing_invoice: { icon: Receipt, color: "text-amber-500" },
  missing_docs: { icon: AlertTriangle, color: "text-amber-500" },
  period_reminder: { icon: AlertTriangle, color: "text-amber-500" },
  period_complete: { icon: CheckCircle2, color: "text-emerald-500" },
  invoice_uploaded: { icon: CheckCircle2, color: "text-emerald-500" },
  statement_uploaded: { icon: CheckCircle2, color: "text-emerald-500" },
  taxes_calculated: { icon: Info, color: "text-blue-500" },
  tax_due: { icon: Info, color: "text-blue-500" },
  service_invoice: { icon: Receipt, color: "text-blue-500" },
  invitation: { icon: Bell, color: "text-blue-500" },
  general: { icon: Bell, color: "text-blue-500" },
};

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  companies?: { name: string } | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Client");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadData() {
      // Get user name
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile) setUserName(profile.full_name || "Client");
      }

      // Get notifications via server action
      const result = await getNotifications();
      setNotifications((result.data || []) as NotificationItem[]);
      setLoading(false);
    }
    loadData();
  }, []);

  function handleMarkAsRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    startTransition(async () => {
      await markAsReadAction(id);
    });
  }

  function handleMarkAllAsRead() {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    startTransition(async () => {
      await markAllAsRead();
    });
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <>
        <DashboardHeader title="Notificari" userName={userName} />
        <div className="p-4 lg:p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Notificari"
        subtitle={`${unreadCount} necitite`}
        userName={userName}
        notificationCount={unreadCount}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={handleMarkAllAsRead}
            >
              Marcheaza toate ca citite
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 lg:p-6">
        <div className="space-y-3">
          {notifications.map((notification) => {
            const config = typeConfig[notification.type] || typeConfig.general;
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                className={cn(
                  "border shadow-none transition-colors",
                  !notification.is_read
                    ? "border-l-2 border-l-primary bg-blue-50/30"
                    : "border-border"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        !notification.is_read ? "bg-primary/10" : "bg-muted"
                      )}
                    >
                      <Icon className={cn("size-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={cn(
                              "text-sm",
                              !notification.is_read
                                ? "font-semibold"
                                : "font-medium text-muted-foreground"
                            )}
                          >
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1.5">
                            {new Date(notification.created_at).toLocaleDateString(
                              "ro-RO",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs shrink-0 h-7 text-primary"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Marcheaza ca citit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {notifications.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="size-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nu ai notificari.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
