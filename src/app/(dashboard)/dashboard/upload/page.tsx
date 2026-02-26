"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { FileUpload } from "@/components/contasync/FileUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Receipt,
  Loader2,
  Sparkles,
  CheckCircle2,
  Upload,
  ArrowRight,
  X,
  Download,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadStatement } from "@/lib/actions/statements";
import { uploadInvoice } from "@/lib/actions/invoices";
import { useRouter } from "next/navigation";

interface BankAccount {
  id: string;
  bank_name: string;
  iban: string;
  currency: string;
}

interface CompanyInfo {
  id: string;
  name: string;
}

interface PeriodInfo {
  id: string;
  month: number;
  year: number;
}

interface DetectedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  currency: string;
  // Invoice attachment state
  invoiceFile?: File;
  invoiceUploaded: boolean;
  invoiceUploading: boolean;
  invoiceId?: string;
  // OCR data from the invoice PDF
  ocrData?: {
    invoice_number?: string;
    partner_name?: string;
    partner_cui?: string;
    issue_date?: string;
    total_amount?: number;
  };
  ocrProcessing?: boolean;
}

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

export default function UploadPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Data state
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [userName, setUserName] = useState("Client");
  const [loading, setLoading] = useState(true);

  // Step tracking
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Statement upload
  const [selectedAccount, setSelectedAccount] = useState("");
  const [statementFiles, setStatementFiles] = useState<File[]>([]);
  const [statementUploading, setStatementUploading] = useState(false);
  const [statementError, setStatementError] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");

  // Step 2: Detected transactions / invoices
  const [detectedTransactions, setDetectedTransactions] = useState<DetectedTransaction[]>([]);
  const [allUploaded, setAllUploaded] = useState(false);

  // Manual invoice add
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualType, setManualType] = useState<"received" | "issued">("received");
  const [manualNumber, setManualNumber] = useState("");
  const [manualPartner, setManualPartner] = useState("");
  const [manualCui, setManualCui] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [manualUploading, setManualUploading] = useState(false);
  const [manualSuccess, setManualSuccess] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualOcrProcessing, setManualOcrProcessing] = useState(false);
  const [manualOcrStatus, setManualOcrStatus] = useState("");

  // Fetch initial data on mount
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile) setUserName(profile.full_name || "Client");

      // Get company
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id, companies(id, name)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (companyUser?.companies) {
        const comp = companyUser.companies as unknown as CompanyInfo;
        setCompany(comp);

        // Get bank accounts
        const { data: accounts } = await supabase
          .from("company_bank_accounts")
          .select("id, bank_name, iban, currency")
          .eq("company_id", comp.id)
          .order("is_primary", { ascending: false });
        setBankAccounts(accounts || []);

        // Get or create current period
        const now = new Date();
        const { data: existingPeriod } = await supabase
          .from("monthly_periods")
          .select("id, month, year")
          .eq("company_id", comp.id)
          .eq("year", now.getFullYear())
          .eq("month", now.getMonth() + 1)
          .single();

        if (existingPeriod) {
          setPeriod(existingPeriod);
        }
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Check if all transactions have invoices uploaded
  useEffect(() => {
    if (detectedTransactions.length > 0) {
      const all = detectedTransactions.every(t => t.invoiceUploaded);
      setAllUploaded(all);
    }
  }, [detectedTransactions]);

  // ============================================
  // STEP 1: Upload statement + OCR extract transactions
  // ============================================
  async function handleStatementUpload() {
    if (!selectedAccount || statementFiles.length === 0 || !company || !period) return;

    setStatementUploading(true);
    setStatementError("");
    setOcrStatus("Se incarca extrasul de cont...");

    try {
      const file = statementFiles[0];
      const supabase = createClient();

      // Upload file to storage
      const now = new Date();
      const filePath = `${company.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/statements/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(uploadData.path);

      // Create statement record
      const formData = new FormData();
      formData.set("company_id", company.id);
      formData.set("period_id", period.id);
      formData.set("bank_account_id", selectedAccount);
      formData.set("file_name", file.name);
      formData.set("file_url", publicUrl);
      formData.set("file_size", String(file.size));

      const result = await uploadStatement(formData);
      if (result.error) {
        setStatementError(result.error);
        setStatementUploading(false);
        setOcrStatus("");
        return;
      }

      // Now run OCR on the uploaded statement
      setOcrStatus("AI citeste extrasul de cont...");

      const ocrRes = await fetch("/api/ocr/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: publicUrl, fileType: "statement" }),
      });

      const ocrResult = await ocrRes.json();

      if (ocrResult.success && ocrResult.transactions && ocrResult.transactions.length > 0) {
        // Save transactions to DB
        const transactionsToInsert = ocrResult.transactions.map((t: { date: string; description: string; amount: number; type: string; currency: string }) => ({
          statement_id: result.data.id,
          company_id: company.id,
          transaction_date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          currency: t.currency,
        }));

        await supabase.from("bank_transactions").insert(transactionsToInsert);

        // Create detected transactions for UI
        const detected: DetectedTransaction[] = ocrResult.transactions.map(
          (t: { date: string; description: string; amount: number; type: string; currency: string }, i: number) => ({
            id: `tx_${i}`,
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type as "credit" | "debit",
            currency: t.currency,
            invoiceUploaded: false,
            invoiceUploading: false,
          })
        );

        setDetectedTransactions(detected);
        setOcrStatus(`AI a gasit ${detected.length} tranzactii. Incarca facturile corespunzatoare.`);
        setStep(2);
      } else {
        setOcrStatus("Nu s-au gasit tranzactii in extras. Poti adauga facturi manual.");
        setDetectedTransactions([]);
        setStep(2);
      }

      setStatementUploading(false);
    } catch (err) {
      setStatementError(err instanceof Error ? err.message : "Eroare la incarcare");
      setStatementUploading(false);
      setOcrStatus("");
    }
  }

  // ============================================
  // STEP 2: Upload invoice for a detected transaction
  // ============================================
  const handleTransactionInvoiceUpload = useCallback(async (txId: string, file: File) => {
    if (!company || !period) return;

    // Mark as uploading
    setDetectedTransactions(prev =>
      prev.map(t => t.id === txId ? { ...t, invoiceUploading: true, ocrProcessing: true } : t)
    );

    try {
      const supabase = createClient();
      const tx = detectedTransactions.find(t => t.id === txId);
      if (!tx) return;

      // Upload invoice file to storage
      const now = new Date();
      const filePath = `${company.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/invoices/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(uploadData.path);

      // Run OCR on the invoice if it's a PDF
      let ocrData: DetectedTransaction["ocrData"] = undefined;
      if (file.name.toLowerCase().endsWith(".pdf")) {
        try {
          const ocrRes = await fetch("/api/ocr/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl: publicUrl, fileType: "invoice" }),
          });
          const ocrResult = await ocrRes.json();
          if (ocrResult.success && ocrResult.data) {
            ocrData = ocrResult.data;
          }
        } catch {
          // OCR failed, use transaction data as fallback
        }
      }

      // Create invoice record — use OCR data if available, otherwise transaction data
      const invoiceFormData = new FormData();
      invoiceFormData.set("company_id", company.id);
      invoiceFormData.set("period_id", period.id);
      invoiceFormData.set("type", tx.type === "debit" ? "received" : "issued");
      invoiceFormData.set("invoice_number", ocrData?.invoice_number || "");
      invoiceFormData.set("partner_name", ocrData?.partner_name || tx.description);
      invoiceFormData.set("partner_cui", ocrData?.partner_cui || "");
      invoiceFormData.set("issue_date", ocrData?.issue_date || tx.date);

      const totalAmount = ocrData?.total_amount || tx.amount;
      const vatAmount = Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
      const amountWithoutVat = Math.round((totalAmount - vatAmount) * 100) / 100;

      invoiceFormData.set("total_amount", String(totalAmount));
      invoiceFormData.set("vat_amount", String(vatAmount));
      invoiceFormData.set("amount_without_vat", String(amountWithoutVat));
      invoiceFormData.set("currency", tx.currency);
      invoiceFormData.set("file_name", file.name);
      invoiceFormData.set("file_url", publicUrl);

      const result = await uploadInvoice(invoiceFormData);

      if (result.error) {
        setDetectedTransactions(prev =>
          prev.map(t => t.id === txId ? { ...t, invoiceUploading: false, ocrProcessing: false } : t)
        );
        return;
      }

      // Mark as uploaded
      setDetectedTransactions(prev =>
        prev.map(t => t.id === txId ? {
          ...t,
          invoiceUploaded: true,
          invoiceUploading: false,
          invoiceFile: file,
          invoiceId: result.data?.id,
          ocrData,
          ocrProcessing: false,
        } : t)
      );

      router.refresh();
    } catch (err) {
      console.error("[Upload] Error:", err);
      setDetectedTransactions(prev =>
        prev.map(t => t.id === txId ? { ...t, invoiceUploading: false, ocrProcessing: false } : t)
      );
    }
  }, [company, period, detectedTransactions, router]);

  // ============================================
  // Manual invoice OCR + upload
  // ============================================
  async function processManualInvoiceOCR(files: File[]) {
    setManualFiles(files);
    if (files.length === 0 || !files[0].name.toLowerCase().endsWith(".pdf")) return;

    setManualOcrProcessing(true);
    setManualOcrStatus("AI citeste factura...");

    try {
      const supabase = createClient();
      const tempPath = `_ocr_temp/${Date.now()}_${files[0].name}`;
      const { data: tempUpload, error: tempError } = await supabase.storage
        .from("documents")
        .upload(tempPath, files[0]);

      if (tempError) {
        setManualOcrStatus("");
        setManualOcrProcessing(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(tempUpload.path);

      const res = await fetch("/api/ocr/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: publicUrl, fileType: "invoice" }),
      });

      const result = await res.json();
      await supabase.storage.from("documents").remove([tempPath]);

      if (result.success && result.data) {
        const d = result.data;
        if (d.invoice_number) setManualNumber(d.invoice_number);
        if (d.partner_name) setManualPartner(d.partner_name);
        if (d.partner_cui) setManualCui(d.partner_cui);
        if (d.issue_date) setManualDate(d.issue_date);
        if (d.total_amount) setManualAmount(String(d.total_amount));

        const confidence = Math.round((result.confidence || 0) * 100);
        setManualOcrStatus(`AI a completat automat (${confidence}% incredere)`);
      } else {
        setManualOcrStatus("Nu s-au putut extrage date. Completeaza manual.");
      }
    } catch {
      setManualOcrStatus("Eroare la citire. Completeaza manual.");
    }

    setManualOcrProcessing(false);
  }

  async function handleManualInvoiceUpload() {
    if (!company || !period) return;

    setManualUploading(true);
    setManualError("");
    setManualSuccess("");

    try {
      let fileUrl = "";
      let fileName = "";

      if (manualFiles.length > 0) {
        const file = manualFiles[0];
        const supabase = createClient();
        const now = new Date();
        const filePath = `${company.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/invoices/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from("documents")
          .getPublicUrl(uploadData.path);

        fileUrl = publicUrl;
        fileName = file.name;
      }

      const totalAmount = parseFloat(manualAmount) || 0;
      const vatAmount = Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
      const amountWithoutVat = Math.round((totalAmount - vatAmount) * 100) / 100;

      const formData = new FormData();
      formData.set("company_id", company.id);
      formData.set("period_id", period.id);
      formData.set("type", manualType);
      formData.set("invoice_number", manualNumber);
      formData.set("partner_name", manualPartner);
      formData.set("partner_cui", manualCui);
      formData.set("issue_date", manualDate || new Date().toISOString().split("T")[0]);
      formData.set("amount_without_vat", String(amountWithoutVat));
      formData.set("vat_amount", String(vatAmount));
      formData.set("total_amount", String(totalAmount));
      formData.set("currency", "RON");
      formData.set("file_name", fileName);
      formData.set("file_url", fileUrl);

      startTransition(async () => {
        const result = await uploadInvoice(formData);
        if (result.error) {
          setManualError(result.error);
        } else {
          setManualSuccess("Factura a fost incarcata cu succes!");
          setManualNumber("");
          setManualPartner("");
          setManualCui("");
          setManualAmount("");
          setManualDate("");
          setManualFiles([]);
          setManualOcrStatus("");
          router.refresh();
        }
        setManualUploading(false);
      });
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Eroare la incarcare");
      setManualUploading(false);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  const now = new Date();
  const subtitle = period
    ? `${MONTHS_RO[period.month - 1]} ${period.year}`
    : `${MONTHS_RO[now.getMonth()]} ${now.getFullYear()}`;

  if (loading) {
    return (
      <>
        <DashboardHeader title="Incarca documente" userName={userName} />
        <div className="p-4 lg:p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Incarca documente"
        subtitle={subtitle}
        userName={userName}
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 1 ? "bg-primary text-primary-foreground" : "bg-emerald-100 text-emerald-700"}`}>
            {step > 1 ? <CheckCircle2 className="size-4" /> : <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>}
            Extras de cont
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
            Facturi
          </div>
        </div>

        {/* ==================== STEP 1 ==================== */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <FileText className="size-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Pasul 1: Incarca extrasul de cont</CardTitle>
                  <CardDescription>AI va citi extrasul si va detecta automat tranzactiile</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank-account">Cont bancar</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger id="bank-account">
                    <SelectValue placeholder="Selecteaza contul bancar" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bank_name} — {account.currency} ({account.iban.slice(-4)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FileUpload
                accept=".pdf"
                multiple={false}
                label="Trage extrasul PDF aici sau click pentru a selecta"
                sublabel="PDF — max. 10 MB"
                onFilesSelected={(files) => setStatementFiles(files)}
              />

              {statementError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="size-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">{statementError}</p>
                </div>
              )}

              {ocrStatus && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  {statementUploading ? (
                    <Sparkles className="size-4 text-blue-600 shrink-0 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  )}
                  <p className="text-sm text-blue-700">{ocrStatus}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={!selectedAccount || statementFiles.length === 0 || statementUploading || !period}
                  onClick={handleStatementUpload}
                >
                  {statementUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      AI proceseaza...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" />
                      Incarca si analizeaza
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setStep(2); setDetectedTransactions([]); }}
                >
                  Sari peste
                  <ArrowRight className="size-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==================== STEP 2 ==================== */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Detected transactions */}
            {detectedTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-50">
                        <Receipt className="size-4 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Tranzactii detectate ({detectedTransactions.filter(t => t.invoiceUploaded).length}/{detectedTransactions.length} completate)
                        </CardTitle>
                        <CardDescription>Incarca factura PDF pentru fiecare tranzactie</CardDescription>
                      </div>
                    </div>
                    {allUploaded && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                        <CheckCircle2 className="size-4" />
                        Toate completate!
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {detectedTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border ${
                          tx.invoiceUploaded
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-card border-border"
                        }`}
                      >
                        {/* Transaction info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              tx.type === "debit"
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {tx.type === "debit" ? "Plata" : "Incasare"}
                            </span>
                            <span className="text-xs text-muted-foreground">{tx.date}</span>
                          </div>
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-lg font-bold">
                            {tx.type === "debit" ? "-" : "+"}{tx.amount.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} {tx.currency}
                          </p>
                        </div>

                        {/* Upload area */}
                        <div className="sm:w-64 shrink-0">
                          {tx.invoiceUploaded ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-100 border border-emerald-200">
                              <CheckCircle2 className="size-4 text-emerald-600" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-emerald-700 truncate">
                                  {tx.invoiceFile?.name}
                                </p>
                                {tx.ocrData?.invoice_number && (
                                  <p className="text-[10px] text-emerald-600">
                                    Nr: {tx.ocrData.invoice_number}
                                    {tx.ocrData.partner_name ? ` — ${tx.ocrData.partner_name}` : ""}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : tx.invoiceUploading ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                              <Loader2 className="size-4 animate-spin text-blue-600" />
                              <p className="text-xs text-blue-700">
                                {tx.ocrProcessing ? "AI citeste factura..." : "Se incarca..."}
                              </p>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors">
                              <Upload className="size-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Incarca factura PDF</span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.png"
                                className="sr-only"
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files && files[0]) {
                                    handleTransactionInvoiceUpload(tx.id, files[0]);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manual invoice add + No transactions state */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-violet-50">
                      <Receipt className="size-4 text-violet-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Adauga factura manual</CardTitle>
                      <CardDescription>
                        {detectedTransactions.length === 0
                          ? "Incarca o factura si AI va completa automat campurile"
                          : "Adauga facturi suplimentare care nu apar in extras"}
                      </CardDescription>
                    </div>
                  </div>
                  {!showManualAdd && (
                    <Button variant="outline" size="sm" onClick={() => setShowManualAdd(true)}>
                      + Adauga
                    </Button>
                  )}
                </div>
              </CardHeader>
              {showManualAdd && (
                <CardContent className="space-y-4">
                  <FileUpload
                    accept=".pdf,.jpg,.png"
                    multiple={false}
                    label="Trage factura aici — AI completeaza automat"
                    sublabel="PDF, JPG, PNG — max. 10 MB"
                    onFilesSelected={processManualInvoiceOCR}
                  />

                  {manualOcrProcessing && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 animate-pulse">
                      <Sparkles className="size-4 text-blue-600 shrink-0" />
                      <p className="text-sm text-blue-700">{manualOcrStatus}</p>
                    </div>
                  )}
                  {!manualOcrProcessing && manualOcrStatus && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <p className="text-sm text-emerald-700">{manualOcrStatus}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tip</Label>
                      <Select value={manualType} onValueChange={(v) => setManualType(v as "received" | "issued")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="received">Primita (cheltuiala)</SelectItem>
                          <SelectItem value="issued">Emisa (venit)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nr. factura</Label>
                      <Input
                        placeholder="ex: FACT-1234"
                        value={manualNumber}
                        onChange={(e) => setManualNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Furnizor / Client</Label>
                      <Input
                        placeholder="ex: Orange Romania SA"
                        value={manualPartner}
                        onChange={(e) => setManualPartner(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CUI / CIF</Label>
                      <Input
                        placeholder="ex: RO12345678"
                        value={manualCui}
                        onChange={(e) => setManualCui(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data emiterii</Label>
                      <Input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Suma totala (RON)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  {manualError && <p className="text-sm text-red-600">{manualError}</p>}
                  {manualSuccess && <p className="text-sm text-emerald-600">{manualSuccess}</p>}

                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      disabled={manualUploading || !period}
                      onClick={handleManualInvoiceUpload}
                    >
                      {manualUploading ? (
                        <><Loader2 className="size-4 animate-spin mr-2" /> Se incarca...</>
                      ) : (
                        <><Upload className="size-4 mr-2" /> Incarca factura</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowManualAdd(false);
                        setManualNumber("");
                        setManualPartner("");
                        setManualCui("");
                        setManualAmount("");
                        setManualDate("");
                        setManualFiles([]);
                        setManualOcrStatus("");
                        setManualError("");
                        setManualSuccess("");
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Back to step 1 */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => {
                setStep(1);
                setOcrStatus("");
                setStatementError("");
                setStatementFiles([]);
              }}>
                Incarca alt extras
              </Button>
              {allUploaded && detectedTransactions.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  Toate facturile au fost incarcate. Contabila va fi notificata.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
