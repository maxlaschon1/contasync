import { getProfile } from "@/lib/actions/auth";
import { getInvoices } from "@/lib/actions/invoices";
import { getCurrentPeriod } from "@/lib/actions/periods";
import { getUnreadCount } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoicesClient } from "./invoices-client";

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

export default async function InvoicesPage() {
  // Auth is checked in layout — no redirect here to avoid loops
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

  const [periodResult, invoicesResult, unreadCount] = await Promise.all([
    getCurrentPeriod(company.id),
    getInvoices(company.id),
    getUnreadCount(),
  ]);

  const now = new Date();
  const subtitle = `${MONTHS_RO[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <InvoicesClient
      invoices={invoicesResult.data || []}
      userName={profile.full_name || "Client"}
      subtitle={subtitle}
      notificationCount={unreadCount}
    />
  );
}
