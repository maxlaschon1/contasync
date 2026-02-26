import Link from "next/link";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { StatusBadge } from "@/components/contasync/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { getCompanies } from "@/lib/actions/companies";
import { getProfile } from "@/lib/actions/auth";

function getStatusBadge(status?: string) {
  switch (status) {
    case "completed":
      return <StatusBadge label="Complet" variant="success" />;
    case "pending_review":
      return <StatusBadge label="În așteptare" variant="warning" />;
    case "open":
      return <StatusBadge label="Deschis" variant="info" />;
    default:
      return <StatusBadge label="—" variant="neutral" />;
  }
}

export default async function CompaniesPage() {
  const profile = await getProfile();
  const { data: companies } = await getCompanies();

  return (
    <>
      <DashboardHeader
        title="Firme"
        subtitle={`${companies.length} firme administrate`}
        userName={profile?.full_name || "Admin"}
        actions={
          <Button size="sm" className="gap-1.5" asChild>
            <Link href="/admin/companies/new">
              <Plus className="size-4" />
              Adaugă firmă
            </Link>
          </Button>
        }
      />

      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firmă</TableHead>
                  <TableHead>CUI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documente</TableHead>
                  <TableHead className="text-right">Taxă lunară</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nu există firme. Adaugă prima firmă.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {company.city}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {company.cui}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(company.period_status)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {(company.statements_count ?? 0) +
                            (company.invoices_count ?? 0)}{" "}
                          documente
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {company.monthly_fee?.toLocaleString("ro-RO")} RON
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/companies/${company.id}`}>
                            Vezi detalii
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
