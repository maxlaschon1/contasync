import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { StatusBadge } from "@/components/contasync/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, FileText, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProfile } from "@/lib/actions/auth";
import { getPeriodHistory } from "@/lib/actions/periods";
import { getUnreadCount } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { PeriodStatus } from "@/types/database";

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

const statusConfig: Record<PeriodStatus, { label: string; variant: "success" | "warning" | "info" | "neutral" }> = {
  open: { label: "Deschis", variant: "info" },
  pending_review: { label: "In revizuire", variant: "warning" },
  completed: { label: "Finalizat", variant: "success" },
  locked: { label: "Blocat", variant: "neutral" },
};

export default async function HistoryPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  // Get user's company
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id, companies(id, name)")
    .eq("user_id", user!.id)
    .limit(1)
    .single();
  const company = companyUser?.companies as any;

  if (!company) {
    return <p className="p-6 text-muted-foreground">Nu ai o firma asociata.</p>;
  }

  const [historyResult, unreadCount] = await Promise.all([
    getPeriodHistory(company.id),
    getUnreadCount(),
  ]);

  const historyData = historyResult.data || [];
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return (
    <>
      <DashboardHeader
        title="Istoric lunar"
        subtitle={company.name}
        userName={profile.full_name || "Client"}
        notificationCount={unreadCount}
      />

      <div className="p-4 lg:p-6">
        {historyData.length === 0 ? (
          <Card className="border border-border shadow-none">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="size-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nu exista perioade inregistrate.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {historyData.map((item: Record<string, unknown>) => {
              const status = (item.status as PeriodStatus) || "open";
              const config = statusConfig[status];
              const isCurrentMonth =
                (item.month as number) === currentMonth &&
                (item.year as number) === currentYear;

              return (
                <Card
                  key={item.id as string}
                  className={cn(
                    "border shadow-none transition-colors",
                    isCurrentMonth
                      ? "border-primary/20 bg-primary/[0.02]"
                      : "border-border"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "size-10 rounded-lg flex items-center justify-center",
                            isCurrentMonth ? "bg-primary/10" : "bg-muted"
                          )}
                        >
                          <Calendar
                            className={cn(
                              "size-4",
                              isCurrentMonth
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {MONTHS_RO[(item.month as number) - 1]} {item.year as number}
                            {isCurrentMonth && (
                              <span className="ml-2 text-xs font-normal text-primary">
                                Luna curenta
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="size-3" />
                              {(item.statements_count as number) || 0} extrase
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Receipt className="size-3" />
                              {(item.invoices_count as number) || 0} facturi
                            </span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge label={config.label} variant={config.variant} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
