import Link from "next/link";
import { FileText, Receipt, Bell, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { StatCard } from "@/components/contasync/StatCard";
import { StatusBadge } from "@/components/contasync/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getProfile } from "@/lib/actions/auth";
import { getCurrentPeriod, getPeriodHistory } from "@/lib/actions/periods";
import { getBankAccounts } from "@/lib/actions/bank-accounts";
import { getStatements } from "@/lib/actions/statements";
import { getInvoices } from "@/lib/actions/invoices";
import { getUnreadCount } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

const statusConfig = {
  completed: { label: "Finalizat", variant: "success" as const, icon: CheckCircle2 },
  pending_review: { label: "In revizuire", variant: "warning" as const, icon: AlertCircle },
  open: { label: "Deschis", variant: "info" as const, icon: AlertCircle },
  locked: { label: "Blocat", variant: "neutral" as const, icon: AlertCircle },
};

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  // Get user's company
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id, companies(*)")
    .eq("user_id", user!.id)
    .limit(1)
    .single();
  const company = companyUser?.companies as any;

  if (!company) {
    return (
      <>
        <DashboardHeader
          title="Dashboard"
          userName={profile.full_name || "Client"}
        />
        <div className="p-4 lg:p-6">
          <Card className="border border-border shadow-none">
            <CardContent className="p-8 text-center text-muted-foreground">
              <p className="text-sm">Nu ai nicio firma asociata contului tau.</p>
              <p className="text-xs mt-1">Contacteaza contabilul pentru a primi o invitatie.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const companyId = company.id;

  // Fetch all data in parallel
  const [
    periodResult,
    bankAccountsResult,
    unreadCount,
    historyResult,
  ] = await Promise.all([
    getCurrentPeriod(companyId),
    getBankAccounts(companyId),
    getUnreadCount(),
    getPeriodHistory(companyId),
  ]);

  const currentPeriod = periodResult.data;
  const bankAccounts = bankAccountsResult.data || [];
  const history = historyResult.data || [];

  // Fetch statements and invoices for current period
  const [statementsResult, invoicesResult] = await Promise.all([
    currentPeriod ? getStatements(companyId, currentPeriod.id) : { data: [] },
    currentPeriod ? getInvoices(companyId, { periodId: currentPeriod.id }) : { data: [] },
  ]);

  const statements = statementsResult.data || [];
  const invoices = invoicesResult.data || [];

  // Calculate stats
  const statementsUploaded = statements.length;
  const statementsRequired = bankAccounts.length;
  const invoicesUploaded = invoices.filter((inv: Record<string, unknown>) => inv.status !== "missing").length;
  const invoicesTotal = invoices.length;

  // Helper: find statement for a bank account
  function getStatementForAccount(bankAccountId: string) {
    return statements.find(
      (s: Record<string, unknown>) => s.bank_account_id === bankAccountId
    );
  }

  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();
  const subtitle = `${MONTHS_RO[currentMonth]} ${currentYear}`;

  // Get recent history (last 5 completed/pending months, excluding current)
  const pastHistory = history
    .filter(
      (m: Record<string, unknown>) =>
        !(m.month === currentMonth + 1 && m.year === currentYear)
    )
    .slice(0, 5);

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        subtitle={subtitle}
        userName={profile.full_name || "Client"}
        notificationCount={unreadCount}
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Extrase de cont"
            value={`${statementsUploaded}/${statementsRequired}`}
            icon={FileText}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Facturi"
            value={`${invoicesUploaded}/${invoicesTotal}`}
            icon={Receipt}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Notificari"
            value={`${unreadCount} noi`}
            icon={Bell}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
        </div>

        {/* Bank Statements Section */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Extrase de cont</CardTitle>
              <Link href="/dashboard/upload">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Upload className="size-3.5" />
                  Incarca extras
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {bankAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nu exista conturi bancare configurate.
              </p>
            ) : (
              <div className="divide-y">
                {bankAccounts.map((account: Record<string, unknown>) => {
                  const statement = getStatementForAccount(account.id as string);
                  const isUploaded = !!statement;

                  return (
                    <div
                      key={account.id as string}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {account.bank_name as string} — {account.currency as string}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(account.iban as string).slice(0, 8)}...{(account.iban as string).slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isUploaded ? (
                          <>
                            <span className="text-xs text-muted-foreground max-sm:hidden">
                              {new Date(statement.uploaded_at as string).toLocaleDateString("ro-RO")}
                            </span>
                            <StatusBadge label="Incarcat" variant="success" />
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground max-sm:hidden">
                              &mdash;
                            </span>
                            <StatusBadge label="Lipsa" variant="danger" />
                            <Link href="/dashboard/upload">
                              <Button variant="outline" size="sm" className="text-xs h-7">
                                Incarca extras
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Required Invoices Section */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Facturi necesare (din analiza extras)
              </CardTitle>
              <Link href="/dashboard/invoices">
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  Vezi toate
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nu exista facturi pentru luna curenta.
              </p>
            ) : (
              <div className="divide-y">
                {invoices.map((invoice: Record<string, unknown>) => {
                  const statusMap: Record<string, { label: string; variant: "success" | "info" | "danger" }> = {
                    verified: { label: "Verificat", variant: "success" },
                    uploaded: { label: "Incarcat", variant: "info" },
                    validated: { label: "Validat", variant: "success" },
                    pending: { label: "In asteptare", variant: "info" },
                    missing: { label: "Lipsa", variant: "danger" },
                    rejected: { label: "Respins", variant: "danger" },
                  };
                  const invoiceStatus = statusMap[invoice.status as string] || statusMap.pending;

                  return (
                    <div
                      key={invoice.id as string}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Receipt className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {(invoice.invoice_number as string) || "Necunoscuta"}{" "}
                            <span className="text-muted-foreground font-normal">
                              — {(invoice.partner_name as string) || (invoice.supplier_name as string) || (invoice.client_name as string) || ""}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {((invoice.total_amount as number) || (invoice.total as number) || 0).toLocaleString("ro-RO", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            {(invoice.currency as string) || "RON"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge
                          label={invoiceStatus.label}
                          variant={invoiceStatus.variant}
                        />
                        {invoice.status === "missing" && (
                          <Link href="/dashboard/upload">
                            <Button variant="outline" size="sm" className="text-xs h-7">
                              Incarca factura
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly History */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Istoric luni</CardTitle>
              <Link href="/dashboard/history">
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  Vezi tot
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {/* Current month */}
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
                <span className="size-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium">
                  {MONTHS_RO[currentMonth].slice(0, 3)} {currentYear}
                </span>
                <span className="text-[10px] text-muted-foreground">In curs</span>
              </div>
              {/* Past months */}
              {pastHistory.map((m: Record<string, unknown>) => {
                const cfg = statusConfig[(m.status as keyof typeof statusConfig) || "open"];
                return (
                  <div
                    key={`${m.month}-${m.year}`}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        m.status === "completed"
                          ? "bg-emerald-500"
                          : m.status === "pending_review"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      )}
                    />
                    <span className="text-xs font-medium">
                      {MONTHS_RO[(m.month as number) - 1].slice(0, 3)} {m.year as number}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
