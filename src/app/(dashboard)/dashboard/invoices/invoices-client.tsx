"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { StatusBadge } from "@/components/contasync/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FilterType = "all" | "received" | "issued";

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "danger" | "warning" }> = {
  verified: { label: "Verificat", variant: "success" },
  validated: { label: "Validat", variant: "success" },
  uploaded: { label: "Incarcat", variant: "info" },
  pending: { label: "In asteptare", variant: "info" },
  missing: { label: "Lipsa", variant: "danger" },
  rejected: { label: "Respins", variant: "warning" },
};

interface InvoicesClientProps {
  invoices: Record<string, unknown>[];
  userName: string;
  subtitle: string;
  notificationCount: number;
}

export function InvoicesClient({
  invoices,
  userName,
  subtitle,
  notificationCount,
}: InvoicesClientProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredInvoices =
    filter === "all"
      ? invoices
      : invoices.filter((inv) => inv.type === filter);

  const filterActions = (
    <div className="flex items-center gap-1">
      <Button
        variant={filter === "all" ? "default" : "ghost"}
        size="sm"
        className="text-xs h-7"
        onClick={() => setFilter("all")}
      >
        Toate
      </Button>
      <Button
        variant={filter === "received" ? "default" : "ghost"}
        size="sm"
        className="text-xs h-7"
        onClick={() => setFilter("received")}
      >
        Primite
      </Button>
      <Button
        variant={filter === "issued" ? "default" : "ghost"}
        size="sm"
        className="text-xs h-7"
        onClick={() => setFilter("issued")}
      >
        Emise
      </Button>
    </div>
  );

  return (
    <>
      <DashboardHeader
        title="Facturi"
        subtitle={subtitle}
        userName={userName}
        notificationCount={notificationCount}
        actions={filterActions}
      />

      <div className="p-4 lg:p-6">
        <Card className="border border-border shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr. Factura</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Furnizor / Client</TableHead>
                  <TableHead className="text-right">Suma</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status as string] || statusConfig.pending;
                  return (
                    <TableRow key={invoice.id as string}>
                      <TableCell className="font-medium">
                        {(invoice.invoice_number as string) || "\u2014"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={invoice.type === "received" ? "Primita" : "Emisa"}
                          variant={invoice.type === "received" ? "info" : "neutral"}
                          dot={false}
                        />
                      </TableCell>
                      <TableCell>
                        {(invoice.partner_name as string) ||
                          (invoice.supplier_name as string) ||
                          (invoice.client_name as string) ||
                          "\u2014"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {((invoice.total_amount as number) || (invoice.total as number) || 0).toLocaleString("ro-RO", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {(invoice.currency as string) || "RON"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {((invoice.vat_amount as number) || (invoice.tva_amount as number) || 0).toLocaleString("ro-RO", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {(invoice.currency as string) || "RON"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(invoice.issue_date as string) || (invoice.invoice_date as string)
                          ? new Date(
                              ((invoice.issue_date as string) || (invoice.invoice_date as string))!
                            ).toLocaleDateString("ro-RO")
                          : "\u2014"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={status.label} variant={status.variant} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nu exista facturi pentru filtrul selectat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
