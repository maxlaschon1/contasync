import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { StatusBadge } from "@/components/contasync/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { getCompany } from "@/lib/actions/companies";
import { getStatements } from "@/lib/actions/statements";
import { getInvoices } from "@/lib/actions/invoices";
import { getTaxes } from "@/lib/actions/taxes";
import { getCurrentPeriod } from "@/lib/actions/periods";
import { getProfile } from "@/lib/actions/auth";
import { notFound } from "next/navigation";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const { data: company } = await getCompany(id);

  if (!company) notFound();

  const { data: period } = await getCurrentPeriod(id);
  const { data: statements } = await getStatements(
    id,
    period?.id
  );
  const { data: invoices } = await getInvoices(id, {
    periodId: period?.id,
  });
  const { data: taxes } = period
    ? await getTaxes(id, period.id)
    : { data: null };

  const MONTHS_RO = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
  ];
  const now = new Date();
  const monthLabel = `${MONTHS_RO[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <>
      <DashboardHeader
        title={company.name}
        subtitle={`CUI: ${company.cui} · ${company.city || ""}`}
        userName={profile?.full_name || "Admin"}
        actions={
          <Button variant="outline" size="sm">
            Editează
          </Button>
        }
      />

      <div className="p-4 lg:p-6">
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents">Documente</TabsTrigger>
            <TabsTrigger value="invoices">Facturi</TabsTrigger>
            <TabsTrigger value="taxes">Taxe</TabsTrigger>
            <TabsTrigger value="settings">Setări</TabsTrigger>
          </TabsList>

          {/* DOCUMENTE TAB */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Extrase de cont — {monthLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(company.company_bank_accounts || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nu există conturi bancare adăugate.
                  </p>
                ) : (
                  (company.company_bank_accounts || []).map(
                    (account: {
                      id: string;
                      bank_name: string;
                      iban: string;
                      currency: string;
                    }) => {
                      const statement = statements.find(
                        (s: { bank_account_id: string }) =>
                          s.bank_account_id === account.id
                      );
                      return (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {account.bank_name} — {account.currency}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {account.iban}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {statement ? (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(
                                    statement.uploaded_at
                                  ).toLocaleDateString("ro-RO")}
                                </span>
                                <StatusBadge
                                  label="Încărcat"
                                  variant="success"
                                />
                              </>
                            ) : (
                              <>
                                <StatusBadge label="Lipsă" variant="danger" />
                                <Button variant="outline" size="sm">
                                  Solicită
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FACTURI TAB */}
          <TabsContent value="invoices">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr. Factură</TableHead>
                      <TableHead>Partener</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead className="text-right">Sumă</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Nu există facturi pentru această perioadă.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map(
                        (inv: {
                          id: string;
                          invoice_number: string;
                          partner_name: string;
                          type: string;
                          total_amount: number;
                          currency: string;
                          issue_date: string;
                          status: string;
                        }) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              {inv.invoice_number || "—"}
                            </TableCell>
                            <TableCell>{inv.partner_name || "—"}</TableCell>
                            <TableCell>
                              <StatusBadge
                                label={
                                  inv.type === "received"
                                    ? "Primită"
                                    : "Emisă"
                                }
                                variant={
                                  inv.type === "received" ? "info" : "neutral"
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {inv.total_amount?.toLocaleString("ro-RO")}{" "}
                              {inv.currency}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {inv.issue_date
                                ? new Date(
                                    inv.issue_date
                                  ).toLocaleDateString("ro-RO")
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                label={
                                  inv.status === "validated"
                                    ? "Validat"
                                    : inv.status === "rejected"
                                    ? "Respins"
                                    : "În așteptare"
                                }
                                variant={
                                  inv.status === "validated"
                                    ? "success"
                                    : inv.status === "rejected"
                                    ? "danger"
                                    : "warning"
                                }
                              />
                            </TableCell>
                          </TableRow>
                        )
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAXE TAB */}
          <TabsContent value="taxes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Calcul taxe — {monthLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!taxes ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Taxele nu au fost calculate încă pentru această perioadă.
                  </p>
                ) : (
                  <>
                    {/* TVA */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">TVA</h4>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">
                            TVA colectat
                          </p>
                          <p className="text-lg font-semibold">
                            {taxes.tva_collected?.toLocaleString("ro-RO")} RON
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">
                            TVA deductibil
                          </p>
                          <p className="text-lg font-semibold">
                            {taxes.tva_deductible?.toLocaleString("ro-RO")} RON
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50">
                          <p className="text-xs text-blue-600">
                            TVA de plată
                          </p>
                          <p className="text-lg font-bold text-blue-700">
                            {taxes.tva_due?.toLocaleString("ro-RO")} RON
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Contributions */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        Contribuții
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "CAS (25%)", value: taxes.cas },
                          { label: "CASS (10%)", value: taxes.cass },
                          {
                            label: "Impozit venit",
                            value: taxes.income_tax,
                          },
                          { label: "CAM (2.25%)", value: taxes.cam },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-3 rounded-lg bg-muted/50"
                          >
                            <p className="text-xs text-muted-foreground">
                              {item.label}
                            </p>
                            <p className="text-base font-semibold">
                              {item.value?.toLocaleString("ro-RO")} RON
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Total */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Total buget de stat</p>
                        <p className="text-2xl font-bold text-primary">
                          {taxes.total_due?.toLocaleString("ro-RO")} RON
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <Button>Calculează taxe</Button>
                  <Button variant="outline">Exportă PDF</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETARI TAB */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informații firmă</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "Denumire", value: company.name },
                    { label: "CUI", value: company.cui },
                    { label: "Nr. Reg. Comerțului", value: company.j_number },
                    {
                      label: "Plătitor TVA",
                      value: company.is_vat_payer ? "Da" : "Nu",
                    },
                    { label: "Regim fiscal", value: company.tax_regime },
                    { label: "Adresă", value: company.address },
                    { label: "Oraș", value: company.city },
                    { label: "Județ", value: company.county },
                    { label: "Email", value: company.contact_email },
                    { label: "Telefon", value: company.contact_phone },
                    { label: "Contact", value: company.contact_name },
                    {
                      label: "Taxă lunară",
                      value: company.monthly_fee
                        ? `${company.monthly_fee.toLocaleString("ro-RO")} RON`
                        : "—",
                    },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium">
                        {item.value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
