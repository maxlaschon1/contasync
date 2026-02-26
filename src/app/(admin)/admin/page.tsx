import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { StatCard } from "@/components/contasync/StatCard";
import { StatusBadge } from "@/components/contasync/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, Clock, AlertTriangle, Send } from "lucide-react";
import { getCompanies, getCompanyStats } from "@/lib/actions/companies";
import { getProfile } from "@/lib/actions/auth";

export default async function AdminDashboardPage() {
  const profile = await getProfile();
  const stats = await getCompanyStats();
  const { data: companies } = await getCompanies();

  const MONTHS_RO = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
  ];
  const now = new Date();
  const subtitle = `${MONTHS_RO[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        subtitle={subtitle}
        userName={profile?.full_name || "Admin"}
        showSearch
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total firme"
            value={stats.total_companies}
            icon={Building2}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Complete luna asta"
            value={stats.complete_this_month}
            icon={CheckCircle2}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="În așteptare"
            value={stats.pending_this_month}
            icon={Clock}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Incomplete"
            value={stats.incomplete_this_month}
            icon={AlertTriangle}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
        </div>

        {/* Companies with issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Firme cu documente lipsă
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nu există firme încă. Adaugă prima firmă din secțiunea Firme.
              </p>
            ) : (
              companies
                .filter((c) => c.period_status !== "completed")
                .map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.statements_count + company.invoices_count}{" "}
                        documente încărcate
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        label={
                          company.period_status === "completed"
                            ? "Complet"
                            : company.period_status === "pending_review"
                            ? "În așteptare"
                            : "Incomplet"
                        }
                        variant={
                          company.period_status === "completed"
                            ? "success"
                            : company.period_status === "pending_review"
                            ? "warning"
                            : "danger"
                        }
                      />
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Send className="size-3.5" />
                        Trimite alertă
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
