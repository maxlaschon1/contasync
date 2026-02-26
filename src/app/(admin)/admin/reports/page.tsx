import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/actions/auth";
import { getCompanyStats } from "@/lib/actions/companies";
import { BarChart3 } from "lucide-react";

export default async function ReportsPage() {
  const profile = await getProfile();
  const stats = await getCompanyStats();

  return (
    <>
      <DashboardHeader
        title="Rapoarte"
        subtitle="Privire de ansamblu"
        userName={profile?.full_name || "Admin"}
      />

      <div className="p-4 lg:p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <BarChart3 className="size-4 text-blue-600" />
              </div>
              <CardTitle className="text-base">Sumar lunar</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total firme</p>
                <p className="text-2xl font-bold">{stats.total_companies}</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50">
                <p className="text-xs text-emerald-600">Complete</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {stats.complete_this_month}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50">
                <p className="text-xs text-amber-600">In asteptare</p>
                <p className="text-2xl font-bold text-amber-700">
                  {stats.pending_this_month}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-red-50">
                <p className="text-xs text-red-600">Incomplete</p>
                <p className="text-2xl font-bold text-red-700">
                  {stats.incomplete_this_month}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-6 text-center py-8">
              Rapoartele detaliate vor fi disponibile in curand.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
