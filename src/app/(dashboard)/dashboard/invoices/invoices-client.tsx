"use client";

import { useState, useRef } from "react";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { StatusBadge } from "@/components/contasync/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Eye, Download, Trash2, Loader2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { deleteInvoice, uploadInvoice } from "@/lib/actions/invoices";
import { updateTransactionMatch, deleteStatement, deleteTransaction } from "@/lib/actions/statements";
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

// Romanian company suffixes
const RO_SUFFIXES = /\b(S\.?R\.?L\.?|S\.?A\.?|I\.?F\.?N\.?|S\.?C\.?|P\.?F\.?A\.?)\b/i;
// EU company suffixes (Ireland, Germany, Netherlands, France, etc.)
const EU_SUFFIXES = /\b(Limited|Ltd|GmbH|B\.?V\.?|AG|SAS|SARL|PBC|ApS|AB|Oy|NV|SE)\b/i;

function getOriginFlag(name: string, currency: string): string {
  if (!name) return "\u{1F310}";
  // Romanian
  if (RO_SUFFIXES.test(name)) return "\u{1F1F7}\u{1F1F4}";
  // EU
  if (EU_SUFFIXES.test(name) || currency === "EUR") return "\u{1F1EA}\u{1F1FA}";
  // International
  return "\u{1F310}";
}

interface InvoicesClientProps {
  invoices: Record<string, unknown>[];
  statements: Record<string, unknown>[];
  unmatchedTransactions: Record<string, unknown>[];
  periodId: string;
  periodStatus: string;
  companyId: string;
  userName: string;
  subtitle: string;
  notificationCount: number;
}

export function InvoicesClient({
  invoices,
  statements,
  unmatchedTransactions,
  periodId,
  periodStatus,
  companyId,
  userName,
  subtitle,
  notificationCount,
}: InvoicesClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: "invoice" | "statement" | "transaction";
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingTxId, setUploadingTxId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTxRef = useRef<Record<string, unknown> | null>(null);

  // Generate a signed URL and open/download the PDF
  async function handleFileAction(fileUrl: string, fileName: string, action: "view" | "download") {
    if (!fileUrl) return;

    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(fileUrl, 300);

    if (error || !data?.signedUrl) {
      toast.error("Nu s-a putut genera link-ul. Incearca din nou.");
      return;
    }

    if (action === "view") {
      window.open(data.signedUrl, "_blank");
    } else {
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

    let result: { error?: string; success?: boolean };

    if (deleteTarget.type === "invoice") {
      result = await deleteInvoice(deleteTarget.id);
    } else if (deleteTarget.type === "statement") {
      result = await deleteStatement(deleteTarget.id);
    } else {
      result = await deleteTransaction(deleteTarget.id);
    }

    if (result.error) {
      toast.error(`Eroare: ${result.error}`);
    } else {
      const labels = { invoice: "Factura stearsa", statement: "Extras de cont sters", transaction: "Tranzactie stearsa" };
      toast.success(labels[deleteTarget.type]);
      router.refresh();
    }

    setDeleting(false);
    setDeleteTarget(null);
  }

  // Upload invoice for unmatched transaction
  function handleUploadClick(tx: Record<string, unknown>) {
    pendingTxRef.current = tx;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const tx = pendingTxRef.current;
    if (!file || !tx) return;

    e.target.value = "";

    const txId = tx.id as string;
    setUploadingTxId(txId);

    try {
      const supabase = createClient();
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const filePath = `${companyId}/${year}/${month}/invoices/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw new Error(uploadError.message);
      const invoiceStoragePath = uploadData.path;

      // Run OCR if PDF
      let ocrData: Record<string, unknown> | undefined;
      if (file.name.toLowerCase().endsWith(".pdf")) {
        try {
          const ocrRes = await fetch("/api/ocr/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storagePath: invoiceStoragePath,
              fileType: "invoice",
            }),
          });
          let ocrResult;
          try {
            const text = await ocrRes.text();
            ocrResult = text ? JSON.parse(text) : { success: false };
          } catch {
            ocrResult = { success: false };
          }
          if (ocrResult.success && ocrResult.data) {
            ocrData = ocrResult.data;
          }
        } catch {
          // OCR failed, fallback to transaction data
        }
      }

      // Always use bank transaction amount (already in RON) — OCR amount may be in foreign currency
      const totalAmount = Math.abs(tx.amount as number);
      const vatAmount = Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
      const amountWithoutVat = Math.round((totalAmount - vatAmount) * 100) / 100;

      const invoiceFormData = new FormData();
      invoiceFormData.set("company_id", companyId);
      invoiceFormData.set("period_id", periodId);
      invoiceFormData.set("type", (tx.type as string) === "debit" ? "received" : "issued");
      invoiceFormData.set("invoice_number", (ocrData?.invoice_number as string) || "");
      invoiceFormData.set("partner_name", (ocrData?.partner_name as string) || (tx.description as string));
      invoiceFormData.set("partner_cui", (ocrData?.partner_cui as string) || "");
      invoiceFormData.set("issue_date", (ocrData?.issue_date as string) || (tx.transaction_date as string) || "");
      invoiceFormData.set("total_amount", String(totalAmount));
      invoiceFormData.set("vat_amount", String(vatAmount));
      invoiceFormData.set("amount_without_vat", String(amountWithoutVat));
      invoiceFormData.set("currency", (tx.currency as string) || "RON");
      invoiceFormData.set("file_name", file.name);
      invoiceFormData.set("file_url", invoiceStoragePath);

      const result = await uploadInvoice(invoiceFormData);

      if (result.error) {
        toast.error(`Eroare: ${result.error}`);
        setUploadingTxId(null);
        return;
      }

      if (result.data?.id) {
        await updateTransactionMatch(txId, result.data.id);
      }

      toast.success("Factura incarcata");
      router.refresh();
    } catch (err) {
      console.error("[InvoicesClient] Upload error:", err);
      toast.error("Eroare la incarcarea facturii");
    }

    setUploadingTxId(null);
    pendingTxRef.current = null;
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

      {/* Hidden file input for Lipsa upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.png"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="p-4 lg:p-6 space-y-4">
        {/* ============ EXTRAS DE CONT — separate table ============ */}
        {statements.length > 0 && (
          <Card className="border border-blue-200 shadow-none bg-blue-50/30">
            <CardHeader className="px-4 py-3 border-b border-blue-200 bg-blue-50/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                <FileText className="size-4 text-blue-500" />
                Extrase de cont
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50/40 hover:bg-blue-50/40">
                    <TableHead className="text-blue-900/70">Banca</TableHead>
                    <TableHead className="text-blue-900/70">Luna</TableHead>
                    <TableHead className="text-blue-900/70">Fisier</TableHead>
                    <TableHead className="text-blue-900/70">Data incarcare</TableHead>
                    <TableHead className="text-blue-900/70">Status</TableHead>
                    <TableHead className="text-right text-blue-900/70">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((stmt) => {
                    const bankAccount = stmt.company_bank_accounts as Record<string, unknown> | null;
                    const bankName = (bankAccount?.bank_name as string) || "Banca";
                    const stmtFileUrl = stmt.file_url as string;
                    const stmtFileName = stmt.file_name as string;
                    const hasStmtFile = stmtFileUrl && stmtFileUrl.length > 0;
                    const uploadedAt = stmt.uploaded_at as string;

                    return (
                      <TableRow key={`stmt-${stmt.id as string}`}>
                        <TableCell className="font-medium">{bankName}</TableCell>
                        <TableCell>{subtitle}</TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                          {stmtFileName || "\u2014"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {uploadedAt
                            ? new Date(uploadedAt).toLocaleDateString("ro-RO")
                            : "\u2014"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge label="Incarcat" variant="success" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {hasStmtFile ? (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleFileAction(stmtFileUrl, stmtFileName, "view")}
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
                                      onClick={() => handleFileAction(stmtFileUrl, stmtFileName, "download")}
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
                                <button disabled className="p-1.5 rounded-md text-muted-foreground/30 cursor-not-allowed">
                                  <Eye className="size-4" />
                                </button>
                                <button disabled className="p-1.5 rounded-md text-muted-foreground/30 cursor-not-allowed">
                                  <Download className="size-4" />
                                </button>
                              </>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setDeleteTarget({
                                    id: stmt.id as string,
                                    name: `${bankName} - ${stmtFileName}`,
                                    type: "statement",
                                  })}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Sterge extras</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ============ FACTURI — invoices + lipsa ============ */}
        <Card className="border border-border shadow-none">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              Facturi
              {filteredInvoices.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({filteredInvoices.length} incarcate{unmatchedTransactions.length > 0 ? ` · ${unmatchedTransactions.length} lipsa` : ""})
                </span>
              )}
            </CardTitle>
          </CardHeader>
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
                {/* Normal invoice rows */}
                {filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status as string] || statusConfig.pending;
                  const fileUrl = invoice.file_url as string;
                  const fileName = invoice.file_name as string;
                  const hasFile = fileUrl && fileUrl.length > 0 && fileName !== "[eFactura]";
                  const partnerName = (invoice.partner_name as string) ||
                    (invoice.supplier_name as string) ||
                    (invoice.client_name as string) || "";
                  const currency = (invoice.currency as string) || "RON";
                  const flag = getOriginFlag(partnerName, currency);

                  return (
                    <TableRow key={invoice.id as string} className="bg-emerald-50/40 hover:bg-emerald-50/60">
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
                        <span className="mr-1.5">{flag}</span>
                        {partnerName || "\u2014"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {((invoice.total_amount as number) || (invoice.total as number) || 0).toLocaleString("ro-RO", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {currency}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {((invoice.vat_amount as number) || (invoice.tva_amount as number) || 0).toLocaleString("ro-RO", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {currency}
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
                                  name: partnerName || (invoice.invoice_number as string) || "Factura",
                                  type: "invoice",
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

                {/* Unmatched transaction rows — "Lipsa" */}
                {unmatchedTransactions.map((tx) => {
                  const isUploading = uploadingTxId === (tx.id as string);
                  const description = (tx.description as string) || "";
                  const currency = (tx.currency as string) || "RON";
                  const flag = getOriginFlag(description, currency);

                  return (
                    <TableRow key={`missing-${tx.id as string}`} className="bg-red-50/50 hover:bg-red-50/70">
                      <TableCell className="font-medium text-muted-foreground">
                        {"\u2014"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={(tx.type as string) === "debit" ? "Primita" : "Emisa"}
                          variant={(tx.type as string) === "debit" ? "info" : "neutral"}
                          dot={false}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="mr-1.5">{flag}</span>
                        {description || "\u2014"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(Math.abs(tx.amount as number) || 0).toLocaleString("ro-RO", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {currency}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {"\u2014"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(tx.transaction_date as string)
                          ? new Date(tx.transaction_date as string).toLocaleDateString("ro-RO")
                          : "\u2014"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label="Lipsa" variant="danger" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleUploadClick(tx)}
                                disabled={isUploading}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isUploading ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Upload className="size-4" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isUploading ? "Se incarca..." : "Incarca factura"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setDeleteTarget({
                                  id: tx.id as string,
                                  name: description || "Tranzactie",
                                  type: "transaction",
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

                {/* Empty state */}
                {filteredInvoices.length === 0 && unmatchedTransactions.length === 0 && (
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
            <DialogTitle>
              {deleteTarget?.type === "statement"
                ? "Sterge extras de cont?"
                : deleteTarget?.type === "transaction"
                ? "Sterge tranzactia?"
                : "Sterge factura?"}
            </DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa stergi &quot;{deleteTarget?.name}&quot;?
              Aceasta actiune nu poate fi anulata.
              {deleteTarget?.type === "statement" && (
                <> Toate tranzactiile asociate vor fi sterse.</>
              )}
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
