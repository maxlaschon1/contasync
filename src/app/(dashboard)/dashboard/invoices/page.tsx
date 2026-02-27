import { getProfile } from "@/lib/actions/auth";
import { getInvoices } from "@/lib/actions/invoices";
import { getCurrentPeriod, getOrCreatePeriod, getPeriodHistory } from "@/lib/actions/periods";
import { getUnreadCount } from "@/lib/actions/notifications";
import { getStatements, getUnmatchedTransactions } from "@/lib/actions/statements";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoicesClient } from "./invoices-client";

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  const { data: companyUser } = await supabase
    .from("company_users")
    .select("company_id, companies(*)")
    .eq("user_id", user!.id)
    .limit(1)
    .single();
  const company = companyUser?.companies as any;

  if (!company) {
    return <p className="p-6 text-muted-foreground">Nu ai o firma asociata.</p>;
  }

  // Determine selected period from URL params (default = current month)
  const params = await searchParams;
  const now = new Date();
  const selectedYear = params.year ? parseInt(params.year) : now.getFullYear();
  const selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1;

  // Fetch period for selected month + period history for the month selector
  const [periodResult, historyResult] = await Promise.all([
    params.year || params.month
      ? getOrCreatePeriod(company.id, selectedYear, selectedMonth)
      : getCurrentPeriod(company.id),
    getPeriodHistory(company.id),
  ]);

  const period = periodResult.data;

  const [invoicesResult, statementsResult, unmatchedResult, unreadCount] = await Promise.all([
    getInvoices(company.id, period?.id ? { periodId: period.id } : undefined),
    period?.id ? getStatements(company.id, period.id) : Promise.resolve({ data: [], error: null }),
    period?.id ? getUnmatchedTransactions(company.id, period.id) : Promise.resolve({ data: [], error: null }),
    getUnreadCount(),
  ]);

  const subtitle = `${MONTHS_RO[selectedMonth - 1]} ${selectedYear}`;

  return (
    <InvoicesClient
      invoices={invoicesResult.data || []}
      statements={statementsResult.data || []}
      unmatchedTransactions={unmatchedResult.data || []}
      periods={historyResult.data || []}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      periodId={period?.id || ""}
      periodStatus={period?.status || "open"}
      companyId={company.id}
      userName={profile.full_name || "Client"}
      subtitle={subtitle}
      notificationCount={unreadCount}
    />
  );
}
