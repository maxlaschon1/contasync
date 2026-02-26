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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Eye, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { deleteInvoice } from "@/lib/actions/invoices";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Generate a signed URL and open/download the PDF
  async function handleFileAction(fileUrl: string, fileName: string, action: "view" | "download") {
    if (!fileUrl) return;

    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(fileUrl, 300); // 5 min expiry

    if (error || !data?.signedUrl) {
      toast.error("Nu s-a putut genera link-ul. Incearca din nou.");
      return;
    }

    if (action === "view") {
      window.open(data.signedUrl, "_blank");
    } else {
      // Download: create a temporary link and click it
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = fileName || "factura.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const result = await deleteInvoice(deleteTarget.id);
    if (result.error) {
      toast.error(`Eroare: ${result.error}`);
    } else {
      toast.success("Factura stearsa");
      router.refresh();
    }

    setDeleting(false);
    setDeleteTarget(null);
  }

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
    <TooltipProvider delayDuration={200}>
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
                  <TableHead className="text-right">Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status as string] || statusConfig.pending;
                  const fileUrl = invoice.file_url as string;
                  const fileName = invoice.file_name as string;
                  const hasFile = fileUrl && fileUrl.length > 0 && fileName !== "[eFactura]";

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
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {hasFile ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleFileAction(fileUrl, fileName, "view")}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <Eye className="size-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Vezi PDF</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleFileAction(fileUrl, fileName, "download")}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  >
                                    <Download className="size-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Descarca</TooltipContent>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    disabled
                                    className="p-1.5 rounded-md text-muted-foreground/30 cursor-not-allowed"
                                  >
                                    <Eye className="size-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {fileName === "[eFactura]" ? "eFactura - fara fisier" : "Fara fisier"}
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    disabled
                                    className="p-1.5 rounded-md text-muted-foreground/30 cursor-not-allowed"
                                  >
                                    <Download className="size-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {fileName === "[eFactura]" ? "eFactura - fara fisier" : "Fara fisier"}
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setDeleteTarget({
                                  id: invoice.id as string,
                                  name: (invoice.partner_name as string) || (invoice.invoice_number as string) || "Factura",
                                })}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Sterge</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nu exista facturi pentru filtrul selectat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sterge factura?</DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa stergi factura &quot;{deleteTarget?.name}&quot;?
              Aceasta actiune nu poate fi anulata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin mr-2" />}
              Sterge definitiv
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
