"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { FileUpload } from "@/components/contasync/FileUpload";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Layers,
  Receipt,
  Loader2,
  Sparkles,
  CheckCircle2,
  Upload,
  ArrowRight,
  X,
  AlertCircle,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  uploadStatement,
  insertTransactions,
  deleteTransaction as deleteTransactionAction,
  deleteStatement as deleteStatementAction,
  updateTransactionMatch,
} from "@/lib/actions/statements";
import {
  uploadInvoice,
  deleteInvoice as deleteInvoiceAction,
} from "@/lib/actions/invoices";
import { getOrCreatePeriod } from "@/lib/actions/periods";
import {
  matchInvoicesToTransactions,
  type ScannedInvoice,
} from "@/lib/ocr/matcher";
import { useRouter } from "next/navigation";

// ============================================
// INTERFACES
// ============================================

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
  dbId?: string;
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
  // eFactura state
  isEfactura: boolean;
  efacturaProcessing?: boolean;
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

// ============================================
// CONSTANTS
// ============================================

const MONTHS_RO = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 2, currentYear - 1, currentYear];

// ============================================
// COMPONENT
// ============================================

export default function UploadPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Data state
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [userName, setUserName] = useState("Client");
  const [loading, setLoading] = useState(true);

  // Period selector
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [periodLoading, setPeriodLoading] = useState(false);

  // Step tracking
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Statement upload
  const [selectedAccount, setSelectedAccount] = useState("");
  const [statementFiles, setStatementFiles] = useState<File[]>([]);
  const [statementUploading, setStatementUploading] = useState(false);
  const [statementError, setStatementError] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");

  // Step 2: Detected transactions / invoices
  const [detectedTransactions, setDetectedTransactions] = useState<
    DetectedTransaction[]
  >([]);
  const [allUploaded, setAllUploaded] = useState(false);
  const [currentStatementId, setCurrentStatementId] = useState<string | null>(
    null
  );

  // Delete statement dialog
  const [showDeleteStatementDialog, setShowDeleteStatementDialog] =
    useState(false);
  const [deletingStatement, setDeletingStatement] = useState(false);

  // Bulk import
  const [bulkState, setBulkState] = useState<"idle" | "processing" | "done">(
    "idle"
  );
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkMatchedCount, setBulkMatchedCount] = useState(0);
  const [unmatchedInvoices, setUnmatchedInvoices] = useState<ScannedInvoice[]>(
    []
  );
  const [assignSelections, setAssignSelections] = useState<
    Record<number, string>
  >({});
  const bulkFilesRef = useRef<Map<number, File>>(new Map());

  // Bulk import — detailed phase tracking
  const [bulkPhase, setBulkPhase] = useState<
    "uploading" | "scanning" | "matching" | "saving" | "done"
  >("uploading");
  const [bulkCurrentFile, setBulkCurrentFile] = useState("");
  const [bulkSavedCount, setBulkSavedCount] = useState(0);

  // Manual invoice add
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualType, setManualType] = useState<"received" | "issued">(
    "received"
  );
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

  // ============================================
  // LOAD DATA ON MOUNT
  // ============================================
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        setSelectedMonth(month);
        setSelectedYear(year);

        const periodResult = await getOrCreatePeriod(comp.id, year, month);
        if (periodResult.data) {
          setPeriod(periodResult.data);
        }
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Check if all transactions have invoices uploaded
  useEffect(() => {
    if (detectedTransactions.length > 0) {
      const all = detectedTransactions.every((t) => t.invoiceUploaded);
      setAllUploaded(all);
    }
  }, [detectedTransactions]);

  // ============================================
  // PERIOD SELECTOR
  // ============================================
  async function handlePeriodChange(month: number, year: number) {
    setSelectedMonth(month);
    setSelectedYear(year);

    if (!company) return;

    setPeriodLoading(true);
    const result = await getOrCreatePeriod(company.id, year, month);
    if (result.data) {
      setPeriod(result.data);
    }
    setPeriodLoading(false);

    // Reset upload state when period changes
    setStep(1);
    setDetectedTransactions([]);
    setCurrentStatementId(null);
    setStatementFiles([]);
    setOcrStatus("");
    setStatementError("");
    setBulkState("idle");
    setUnmatchedInvoices([]);
    setBulkMatchedCount(0);
    setAssignSelections({});
    setBulkSavedCount(0);
    setBulkCurrentFile("");
    bulkFilesRef.current.clear();
  }

  // ============================================
  // STEP 1: Upload statement + OCR extract transactions
  // ============================================
  async function handleStatementUpload() {
    if (!selectedAccount || statementFiles.length === 0 || !company || !period)
      return;

    setStatementUploading(true);
    setStatementError("");
    setOcrStatus("Se incarca extrasul de cont...");

    try {
      const file = statementFiles[0];
      const supabase = createClient();

      // Upload file to storage
      const filePath = `${company.id}/${selectedYear}/${String(selectedMonth).padStart(2, "0")}/statements/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw new Error(uploadError.message);

      const storagePath = uploadData.path;

      // Create statement record
      const formData = new FormData();
      formData.set("company_id", company.id);
      formData.set("period_id", period.id);
      formData.set("bank_account_id", selectedAccount);
      formData.set("file_name", file.name);
      formData.set("file_url", storagePath);
      formData.set("file_size", String(file.size));

      const result = await uploadStatement(formData);
      if (result.error) {
        setStatementError(result.error);
        setStatementUploading(false);
        setOcrStatus("");
        return;
      }

      setCurrentStatementId(result.data.id);

      // Now run OCR on the uploaded statement
      setOcrStatus("AI citeste extrasul de cont...");

      const ocrRes = await fetch("/api/ocr/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath, fileType: "statement" }),
      });

      let ocrResult;
      try {
        const text = await ocrRes.text();
        ocrResult = text ? JSON.parse(text) : { success: false };
      } catch {
        console.error(
          "[OCR] Failed to parse response, status:",
          ocrRes.status
        );
        ocrResult = { success: false };
      }

      if (
        ocrResult.success &&
        ocrResult.transactions &&
        ocrResult.transactions.length > 0
      ) {
        // Save transactions to DB using server action (service role)
        const transactionsToInsert = ocrResult.transactions.map(
          (t: {
            date: string;
            description: string;
            amount: number;
            type: string;
            currency: string;
          }) => ({
            statement_id: result.data.id,
            company_id: company.id,
            transaction_date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            currency: t.currency,
          })
        );

        const insertResult = await insertTransactions(transactionsToInsert);
        const dbIds = insertResult.data || [];

        // Create detected transactions for UI with real DB IDs
        const detected: DetectedTransaction[] = ocrResult.transactions.map(
          (
            t: {
              date: string;
              description: string;
              amount: number;
              type: string;
              currency: string;
            },
            i: number
          ) => ({
            id: `tx_${i}`,
            dbId: dbIds[i]?.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type as "credit" | "debit",
            currency: t.currency,
            invoiceUploaded: false,
            invoiceUploading: false,
            isEfactura: false,
          })
        );

        setDetectedTransactions(detected);
        setOcrStatus(
          `AI a gasit ${detected.length} tranzactii. Incarca facturile corespunzatoare.`
        );
        setStep(2);
      } else {
        setOcrStatus(
          "Nu s-au gasit tranzactii in extras. Poti adauga facturi manual."
        );
        setDetectedTransactions([]);
        setStep(2);
      }

      setStatementUploading(false);
    } catch (err) {
      setStatementError(
        err instanceof Error ? err.message : "Eroare la incarcare"
      );
      setStatementUploading(false);
      setOcrStatus("");
    }
  }

  // ============================================
  // STEP 2: Upload invoice for a detected transaction
  // ============================================
  const handleTransactionInvoiceUpload = useCallback(
    async (tx: DetectedTransaction, file: File) => {
      if (!company || !period) return;

      const txId = tx.id;

      // Mark as uploading
      setDetectedTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? { ...t, invoiceUploading: true, ocrProcessing: true }
            : t
        )
      );

      try {
        const supabase = createClient();

        // Upload invoice file to storage
        const filePath = `${company.id}/${selectedYear}/${String(selectedMonth).padStart(2, "0")}/invoices/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) throw new Error(uploadError.message);

        const invoiceStoragePath = uploadData.path;

        // Run OCR on the invoice if it's a PDF
        let ocrData: DetectedTransaction["ocrData"] = undefined;
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
            // OCR failed, use transaction data as fallback
          }
        }

        // Create invoice record
        const invoiceFormData = new FormData();
        invoiceFormData.set("company_id", company.id);
        invoiceFormData.set("period_id", period.id);
        invoiceFormData.set(
          "type",
          tx.type === "debit" ? "received" : "issued"
        );
        invoiceFormData.set(
          "invoice_number",
          ocrData?.invoice_number || ""
        );
        invoiceFormData.set(
          "partner_name",
          ocrData?.partner_name || tx.description
        );
        invoiceFormData.set("partner_cui", ocrData?.partner_cui || "");
        invoiceFormData.set(
          "issue_date",
          ocrData?.issue_date || tx.date
        );

        // Always use bank transaction amount (already in RON) — OCR amount may be in foreign currency
        const totalAmount = Math.abs(tx.amount);
        const vatAmount =
          Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
        const amountWithoutVat =
          Math.round((totalAmount - vatAmount) * 100) / 100;

        invoiceFormData.set("total_amount", String(totalAmount));
        invoiceFormData.set("vat_amount", String(vatAmount));
        invoiceFormData.set("amount_without_vat", String(amountWithoutVat));
        invoiceFormData.set("currency", tx.currency);
        invoiceFormData.set("file_name", file.name);
        invoiceFormData.set("file_url", invoiceStoragePath);

        const result = await uploadInvoice(invoiceFormData);

        if (result.error) {
          console.error("[Upload] uploadInvoice error:", result.error);
          setDetectedTransactions((prev) =>
            prev.map((t) =>
              t.id === txId
                ? { ...t, invoiceUploading: false, ocrProcessing: false }
                : t
            )
          );
          toast.error(`Eroare: ${result.error}`);
          return;
        }

        // Link transaction to invoice in DB
        const txObj = detectedTransactions.find((t) => t.id === txId);
        if (txObj?.dbId && result.data?.id) {
          await updateTransactionMatch(txObj.dbId, result.data.id);
        }

        // Mark as uploaded
        setDetectedTransactions((prev) =>
          prev.map((t) =>
            t.id === txId
              ? {
                  ...t,
                  invoiceUploaded: true,
                  invoiceUploading: false,
                  invoiceFile: file,
                  invoiceId: result.data?.id,
                  ocrData,
                  ocrProcessing: false,
                }
              : t
          )
        );

        toast.success("Factura incarcata");
        router.refresh();
      } catch (err) {
        console.error("[Upload] Error:", err);
        setDetectedTransactions((prev) =>
          prev.map((t) =>
            t.id === txId
              ? { ...t, invoiceUploading: false, ocrProcessing: false }
              : t
          )
        );
        toast.error("Eroare la incarcarea facturii");
      }
    },
    [company, period, selectedYear, selectedMonth, router]
  );

  // ============================================
  // DELETE TRANSACTION
  // ============================================
  async function handleDeleteTransaction(txId: string) {
    const tx = detectedTransactions.find((t) => t.id === txId);
    if (!tx) return;

    // If there was an invoice, delete it first
    if (tx.invoiceId) {
      await deleteInvoiceAction(tx.invoiceId);
    }

    // If there's a DB id, delete from DB
    if (tx.dbId) {
      const result = await deleteTransactionAction(tx.dbId);
      if (result.error) {
        toast.error("Eroare la stergerea tranzactiei");
        return;
      }
    }

    // Remove from state
    setDetectedTransactions((prev) => prev.filter((t) => t.id !== txId));
    toast.success("Tranzactie stearsa");
  }

  // ============================================
  // TOGGLE eFACTURA
  // ============================================
  async function handleToggleEfactura(txId: string) {
    const tx = detectedTransactions.find((t) => t.id === txId);
    if (!tx || !company || !period) return;

    if (tx.isEfactura) {
      // Uncheck: delete the efactura invoice
      if (tx.invoiceId) {
        setDetectedTransactions((prev) =>
          prev.map((t) =>
            t.id === txId ? { ...t, efacturaProcessing: true } : t
          )
        );

        await deleteInvoiceAction(tx.invoiceId);

        setDetectedTransactions((prev) =>
          prev.map((t) =>
            t.id === txId
              ? {
                  ...t,
                  isEfactura: false,
                  invoiceUploaded: false,
                  invoiceId: undefined,
                  efacturaProcessing: false,
                }
              : t
          )
        );
        toast.success("eFactura dezactivat");
      }
    } else {
      // Check: create an efactura invoice
      setDetectedTransactions((prev) =>
        prev.map((t) =>
          t.id === txId ? { ...t, efacturaProcessing: true } : t
        )
      );

      const totalAmount = tx.amount;
      const vatAmount =
        Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
      const amountWithoutVat =
        Math.round((totalAmount - vatAmount) * 100) / 100;

      const formData = new FormData();
      formData.set("company_id", company.id);
      formData.set("period_id", period.id);
      formData.set("type", tx.type === "debit" ? "received" : "issued");
      formData.set("partner_name", tx.description);
      formData.set("issue_date", tx.date);
      formData.set("total_amount", String(totalAmount));
      formData.set("vat_amount", String(vatAmount));
      formData.set("amount_without_vat", String(amountWithoutVat));
      formData.set("currency", tx.currency);
      formData.set("is_efactura", "true");
      formData.set("invoice_number", "");
      formData.set("partner_cui", "");
      formData.set("file_name", "");
      formData.set("file_url", "");

      const result = await uploadInvoice(formData);

      if (result.error) {
        toast.error("Eroare la marcarea eFactura");
        setDetectedTransactions((prev) =>
          prev.map((t) =>
            t.id === txId ? { ...t, efacturaProcessing: false } : t
          )
        );
        return;
      }

      setDetectedTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? {
                ...t,
                isEfactura: true,
                invoiceUploaded: true,
                invoiceId: result.data?.id,
                efacturaProcessing: false,
              }
            : t
        )
      );
      toast.success("Marcat ca eFactura");
    }
  }

  // ============================================
  // DELETE UPLOADED INVOICE
  // ============================================
  async function handleDeleteUploadedInvoice(txId: string) {
    const tx = detectedTransactions.find((t) => t.id === txId);
    if (!tx || !tx.invoiceId) return;

    const result = await deleteInvoiceAction(tx.invoiceId);
    if (result.error) {
      toast.error("Eroare la stergerea facturii");
      return;
    }

    setDetectedTransactions((prev) =>
      prev.map((t) =>
        t.id === txId
          ? {
              ...t,
              invoiceUploaded: false,
              invoiceId: undefined,
              invoiceFile: undefined,
              ocrData: undefined,
              isEfactura: false,
            }
          : t
      )
    );
    toast.success("Factura stearsa");
  }

  // ============================================
  // DELETE STATEMENT
  // ============================================
  async function handleDeleteStatement() {
    if (!currentStatementId) return;

    setDeletingStatement(true);
    const result = await deleteStatementAction(currentStatementId);

    if (result.error) {
      toast.error("Eroare la stergerea extrasului");
      setDeletingStatement(false);
      return;
    }

    // Reset everything
    setStep(1);
    setDetectedTransactions([]);
    setCurrentStatementId(null);
    setStatementFiles([]);
    setOcrStatus("");
    setShowDeleteStatementDialog(false);
    setDeletingStatement(false);
    toast.success("Extras de cont sters");
  }

  // ============================================
  // BULK INVOICE IMPORT
  // ============================================
  async function handleBulkInvoiceImport(files: File[]) {
    if (files.length === 0 || !company || !period) return;

    setBulkState("processing");
    setBulkPhase("uploading");
    setBulkProgress({ current: 0, total: files.length });
    setBulkCurrentFile("");
    setBulkSavedCount(0);
    bulkFilesRef.current.clear();

    const supabase = createClient();
    const scanned: ScannedInvoice[] = [];

    // Process files in batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      // Update phase: uploading for first half, scanning for second half
      const progress = (i / files.length) * 100;
      if (progress < 50) {
        setBulkPhase("uploading");
      } else {
        setBulkPhase("scanning");
      }
      setBulkCurrentFile(batch[0].name);

      const batchResults = await Promise.all(
        batch.map(async (file, batchIdx) => {
          const globalIdx = i + batchIdx;
          bulkFilesRef.current.set(globalIdx, file);

          try {
            // Upload to storage
            setBulkCurrentFile(file.name);
            const filePath = `${company.id}/${selectedYear}/${String(selectedMonth).padStart(2, "0")}/invoices/${Date.now()}_${globalIdx}_${file.name}`;
            const { data: uploadData, error: uploadError } =
              await supabase.storage.from("documents").upload(filePath, file);

            if (uploadError) {
              console.warn("[Bulk] Upload failed for:", file.name, uploadError.message);
              return {
                fileIndex: globalIdx,
                fileName: file.name,
                storagePath: "",
                ocrData: null,
                ocrConfidence: 0,
                rawText: "",
              } as ScannedInvoice;
            }

            // OCR scan
            let ocrData = null;
            let ocrConfidence = 0;
            let rawText = "";

            if (file.name.toLowerCase().endsWith(".pdf")) {
              try {
                const ocrRes = await fetch("/api/ocr/process", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    storagePath: uploadData.path,
                    fileType: "invoice",
                  }),
                });
                let result;
                try {
                  const text = await ocrRes.text();
                  result = text ? JSON.parse(text) : { success: false };
                } catch {
                  result = { success: false };
                }
                if (result.success && result.data) {
                  ocrData = result.data;
                  ocrConfidence = result.confidence || 0;
                }
                // Always capture raw text for name matching
                if (result.raw_text) {
                  rawText = result.raw_text;
                }
              } catch {
                // OCR failed for this file
              }
            }

            return {
              fileIndex: globalIdx,
              fileName: file.name,
              storagePath: uploadData.path,
              ocrData,
              ocrConfidence,
              rawText,
            } as ScannedInvoice;
          } catch (err) {
            console.error("[Bulk] Error processing file:", file.name, err);
            return {
              fileIndex: globalIdx,
              fileName: file.name,
              storagePath: "",
              ocrData: null,
              ocrConfidence: 0,
              rawText: "",
            } as ScannedInvoice;
          }
        })
      );

      scanned.push(...batchResults);
      setBulkProgress({
        current: Math.min(i + BATCH_SIZE, files.length),
        total: files.length,
      });
    }

    // Phase: Matching
    setBulkPhase("matching");
    setBulkCurrentFile("");

    // Debug: log scanned invoices before matching
    console.log("[Bulk] Scanned invoices:", scanned.length);
    for (const s of scanned) {
      console.log(`  [${s.fileIndex}] ${s.fileName} | OCR: ${s.ocrData?.partner_name || "none"} | rawText: ${s.rawText ? s.rawText.length + " chars" : "EMPTY"}`);
    }
    console.log("[Bulk] Available transactions:", detectedTransactions.filter(t => !t.invoiceUploaded).length);

    // Run matching algorithm (pass company name to filter out own-company false matches)
    const matchResults = matchInvoicesToTransactions(
      scanned,
      detectedTransactions,
      company.name
    );

    // Debug: log match results
    console.log("[Bulk] Match results:", matchResults.length);
    for (const r of matchResults) {
      console.log(`  ${r.invoice.fileName.substring(0, 40)} -> ${r.transaction ? r.transaction.description : "UNMATCHED"} (score: ${r.score})`);
    }

    // Phase: Saving matched pairs
    setBulkPhase("saving");

    // Process matched pairs: create invoice records
    let matchedCount = 0;
    const unmatched: ScannedInvoice[] = [];

    for (const result of matchResults) {
      if (result.transaction) {
        const inv = result.invoice;
        const tx = result.transaction;

        // Always use bank transaction amount (already in RON) — OCR amount may be in foreign currency
        const totalAmount = Math.abs(tx.amount);
        const vatAmount =
          Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
        const amountWithoutVat =
          Math.round((totalAmount - vatAmount) * 100) / 100;

        const formData = new FormData();
        formData.set("company_id", company.id);
        formData.set("period_id", period.id);
        formData.set("type", tx.type === "debit" ? "received" : "issued");
        formData.set("invoice_number", inv.ocrData?.invoice_number || "");
        formData.set(
          "partner_name",
          inv.ocrData?.partner_name || tx.description
        );
        formData.set("partner_cui", inv.ocrData?.partner_cui || "");
        formData.set("issue_date", inv.ocrData?.issue_date || tx.date);
        formData.set("total_amount", String(totalAmount));
        formData.set("vat_amount", String(vatAmount));
        formData.set("amount_without_vat", String(amountWithoutVat));
        formData.set("currency", tx.currency);
        formData.set("file_name", inv.fileName);
        formData.set("file_url", inv.storagePath);

        const uploadResult = await uploadInvoice(formData);

        if (!uploadResult.error) {
          matchedCount++;
          setBulkSavedCount(matchedCount);
          setBulkCurrentFile(inv.fileName);

          // Link transaction to invoice in DB
          const txObj = detectedTransactions.find((t) => t.id === tx.id);
          if (txObj?.dbId && uploadResult.data?.id) {
            await updateTransactionMatch(txObj.dbId, uploadResult.data.id);
          }

          setDetectedTransactions((prev) =>
            prev.map((t) =>
              t.id === tx.id
                ? {
                    ...t,
                    invoiceUploaded: true,
                    invoiceFile: bulkFilesRef.current.get(inv.fileIndex),
                    invoiceId: uploadResult.data?.id,
                    ocrData: inv.ocrData || undefined,
                  }
                : t
            )
          );
        } else {
          // Upload failed — don't lose the invoice! Show it as unmatched
          console.error("[Bulk] uploadInvoice failed:", inv.fileName, "->", tx.description, uploadResult.error);
          unmatched.push(inv);
        }
      } else {
        unmatched.push(result.invoice);
      }
    }

    setUnmatchedInvoices(unmatched);
    setBulkMatchedCount(matchedCount);
    setBulkState("done");

    if (matchedCount > 0) {
      toast.success(`${matchedCount} facturi potrivite automat!`);
    }
    if (unmatched.length > 0) {
      toast.info(
        `${unmatched.length} facturi necesita asociere manuala.`
      );
    }
    if (matchedCount === 0 && unmatched.length === 0 && scanned.length > 0) {
      toast.warning("Nicio factura nu a fost procesata. Verifica fisierele.");
    }

    router.refresh();
  }

  // ============================================
  // MANUAL ASSIGN (unmatched bulk invoices)
  // ============================================
  async function handleManualBulkAssign(
    invoice: ScannedInvoice,
    txId: string
  ) {
    const tx = detectedTransactions.find((t) => t.id === txId);
    if (!tx || !company || !period) return;

    // Always use bank transaction amount (already in RON) — OCR amount may be in foreign currency
    const totalAmount = Math.abs(tx.amount);
    const vatAmount =
      Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
    const amountWithoutVat =
      Math.round((totalAmount - vatAmount) * 100) / 100;

    const formData = new FormData();
    formData.set("company_id", company.id);
    formData.set("period_id", period.id);
    formData.set("type", tx.type === "debit" ? "received" : "issued");
    formData.set("invoice_number", invoice.ocrData?.invoice_number || "");
    formData.set(
      "partner_name",
      invoice.ocrData?.partner_name || tx.description
    );
    formData.set("partner_cui", invoice.ocrData?.partner_cui || "");
    formData.set("issue_date", invoice.ocrData?.issue_date || tx.date);
    formData.set("total_amount", String(totalAmount));
    formData.set("vat_amount", String(vatAmount));
    formData.set("amount_without_vat", String(amountWithoutVat));
    formData.set("currency", tx.currency);
    formData.set("file_name", invoice.fileName);
    formData.set("file_url", invoice.storagePath);

    const result = await uploadInvoice(formData);

    if (result.error) {
      toast.error("Eroare la asocierea facturii");
      return;
    }

    // Link transaction to invoice in DB
    const txObj = detectedTransactions.find((t) => t.id === txId);
    if (txObj?.dbId && result.data?.id) {
      await updateTransactionMatch(txObj.dbId, result.data.id);
    }

    // Update transaction state
    setDetectedTransactions((prev) =>
      prev.map((t) =>
        t.id === txId
          ? {
              ...t,
              invoiceUploaded: true,
              invoiceFile: bulkFilesRef.current.get(invoice.fileIndex),
              invoiceId: result.data?.id,
              ocrData: invoice.ocrData || undefined,
            }
          : t
      )
    );

    // Remove from unmatched
    setUnmatchedInvoices((prev) =>
      prev.filter((i) => i.fileIndex !== invoice.fileIndex)
    );
    setAssignSelections((prev) => {
      const next = { ...prev };
      delete next[invoice.fileIndex];
      return next;
    });
    toast.success("Factura asociata cu succes!");
  }

  // ============================================
  // Manual invoice OCR + upload
  // ============================================
  async function processManualInvoiceOCR(files: File[]) {
    setManualFiles(files);
    if (files.length === 0 || !files[0].name.toLowerCase().endsWith(".pdf"))
      return;

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

      const res = await fetch("/api/ocr/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: tempUpload.path,
          fileType: "invoice",
        }),
      });

      let result;
      try {
        const text = await res.text();
        result = text ? JSON.parse(text) : { success: false };
      } catch {
        result = { success: false };
      }
      await supabase.storage.from("documents").remove([tempPath]);

      if (result.success && result.data) {
        const d = result.data;
        if (d.invoice_number) setManualNumber(d.invoice_number);
        if (d.partner_name) setManualPartner(d.partner_name);
        if (d.partner_cui) setManualCui(d.partner_cui);
        if (d.issue_date) setManualDate(d.issue_date);
        if (d.total_amount) setManualAmount(String(d.total_amount));

        const confidence = Math.round((result.confidence || 0) * 100);
        setManualOcrStatus(
          `AI a completat automat (${confidence}% incredere)`
        );
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
        const filePath = `${company.id}/${selectedYear}/${String(selectedMonth).padStart(2, "0")}/invoices/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } =
          await supabase.storage.from("documents").upload(filePath, file);

        if (uploadError) throw new Error(uploadError.message);

        fileUrl = uploadData.path;
        fileName = file.name;
      }

      const totalAmount = parseFloat(manualAmount) || 0;
      const vatAmount =
        Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
      const amountWithoutVat =
        Math.round((totalAmount - vatAmount) * 100) / 100;

      const formData = new FormData();
      formData.set("company_id", company.id);
      formData.set("period_id", period.id);
      formData.set("type", manualType);
      formData.set("invoice_number", manualNumber);
      formData.set("partner_name", manualPartner);
      formData.set("partner_cui", manualCui);
      formData.set(
        "issue_date",
        manualDate || new Date().toISOString().split("T")[0]
      );
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
      setManualError(
        err instanceof Error ? err.message : "Eroare la incarcare"
      );
      setManualUploading(false);
    }
  }

  // ============================================
  // RENDER
  // ============================================

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
        subtitle={`${MONTHS_RO[selectedMonth - 1]} ${selectedYear}`}
        userName={userName}
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* ==================== PERIOD SELECTOR ==================== */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarDays className="size-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Perioada:</span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(v) =>
                    handlePeriodChange(Number(v), selectedYear)
                  }
                >
                  <SelectTrigger className="w-40 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS_RO.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) =>
                    handlePeriodChange(selectedMonth, Number(v))
                  }
                >
                  <SelectTrigger className="w-24 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {periodLoading && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 1 ? "bg-primary text-primary-foreground" : "bg-emerald-100 text-emerald-700"}`}
          >
            {step > 1 ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                1
              </span>
            )}
            Extras de cont
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
              2
            </span>
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
                  <CardTitle className="text-base">
                    Pasul 1: Incarca extrasul de cont
                  </CardTitle>
                  <CardDescription>
                    AI va citi extrasul si va detecta automat tranzactiile
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank-account">Cont bancar</Label>
                <Select
                  value={selectedAccount}
                  onValueChange={setSelectedAccount}
                >
                  <SelectTrigger id="bank-account">
                    <SelectValue placeholder="Selecteaza contul bancar" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bank_name} — {account.currency} (
                        {account.iban.slice(-4)})
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
                  disabled={
                    !selectedAccount ||
                    statementFiles.length === 0 ||
                    statementUploading ||
                    !period
                  }
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
                  onClick={() => {
                    setStep(2);
                    setDetectedTransactions([]);
                  }}
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
                          Tranzactii detectate (
                          {
                            detectedTransactions.filter(
                              (t) => t.invoiceUploaded
                            ).length
                          }
                          /{detectedTransactions.length} completate)
                        </CardTitle>
                        <CardDescription>
                          Incarca factura PDF, bifeaza eFactura, sau sterge
                          tranzactiile inutile
                        </CardDescription>
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
                            ? tx.isEfactura
                              ? "bg-violet-50/50 border-violet-200"
                              : "bg-emerald-50/50 border-emerald-200"
                            : "bg-card border-border"
                        }`}
                      >
                        {/* Transaction info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded ${
                                tx.type === "debit"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {tx.type === "debit" ? "Plata" : "Incasare"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {tx.date}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {tx.description}
                          </p>
                          <p className="text-lg font-bold">
                            {tx.type === "debit" ? "-" : "+"}
                            {tx.amount.toLocaleString("ro-RO", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            {tx.currency}
                          </p>
                        </div>

                        {/* Actions area */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* eFactura checkbox — show when: not uploading, not processing, AND (not completed OR completed via eFactura) */}
                          {!tx.invoiceUploading &&
                            !tx.efacturaProcessing &&
                            (!tx.invoiceUploaded || tx.isEfactura) && (
                              <div className="flex items-center gap-1.5 mr-1">
                                <Checkbox
                                  id={`efactura-${tx.id}`}
                                  checked={tx.isEfactura}
                                  onCheckedChange={() =>
                                    handleToggleEfactura(tx.id)
                                  }
                                />
                                <Label
                                  htmlFor={`efactura-${tx.id}`}
                                  className="text-xs cursor-pointer whitespace-nowrap"
                                >
                                  eFactura
                                </Label>
                              </div>
                            )}

                          {/* Upload / Status area */}
                          <div className="w-48 shrink-0">
                            {tx.efacturaProcessing ? (
                              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-50 border border-violet-200">
                                <Loader2 className="size-4 animate-spin text-violet-600" />
                                <p className="text-xs text-violet-700">
                                  Se proceseaza...
                                </p>
                              </div>
                            ) : tx.isEfactura && tx.invoiceUploaded ? (
                              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-100 border border-violet-200">
                                <CheckCircle2 className="size-4 text-violet-600" />
                                <span className="text-xs font-medium text-violet-700">
                                  eFactura
                                </span>
                              </div>
                            ) : tx.invoiceUploaded ? (
                              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-100 border border-emerald-200">
                                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-emerald-700 truncate">
                                    {tx.invoiceFile?.name || "Factura"}
                                  </p>
                                  {tx.ocrData?.invoice_number && (
                                    <p className="text-[10px] text-emerald-600">
                                      Nr: {tx.ocrData.invoice_number}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    handleDeleteUploadedInvoice(tx.id)
                                  }
                                  className="p-1 rounded hover:bg-red-100 transition-colors"
                                  title="Sterge factura"
                                >
                                  <Trash2 className="size-3.5 text-red-400 hover:text-red-600" />
                                </button>
                              </div>
                            ) : tx.invoiceUploading ? (
                              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                                <Loader2 className="size-4 animate-spin text-blue-600" />
                                <p className="text-xs text-blue-700">
                                  {tx.ocrProcessing
                                    ? "AI citeste..."
                                    : "Se incarca..."}
                                </p>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors">
                                <Upload className="size-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Incarca factura
                                </span>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.png"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const files = e.target.files;
                                    if (files && files[0]) {
                                      handleTransactionInvoiceUpload(
                                        tx,
                                        files[0]
                                      );
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          {/* Delete transaction button */}
                          {!tx.invoiceUploading && !tx.efacturaProcessing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              title="Sterge tranzactia"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delete statement button */}
                  {currentStatementId && (
                    <div className="mt-6 pt-4 border-t">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteStatementDialog(true)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        Sterge extrasul de cont
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ==================== BULK IMPORT ==================== */}
            {detectedTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Layers className="size-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Importa facturi in masa
                      </CardTitle>
                      <CardDescription>
                        Trage toate facturile PDF — AI le potriveste automat cu
                        tranzactiile din extras
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* IDLE — Show drop zone */}
                  {bulkState === "idle" && (
                    <FileUpload
                      accept=".pdf,.jpg,.png"
                      multiple={true}
                      label="Trage toate facturile aici sau click pentru a selecta"
                      sublabel="PDF, JPG, PNG — selecteaza mai multe fisiere odata"
                      onFilesSelected={handleBulkInvoiceImport}
                    />
                  )}

                  {/* PROCESSING — Show detailed progress */}
                  {bulkState === "processing" && (
                    <div className="py-6 space-y-6">
                      {/* Main loading animation + phase message */}
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="size-16 rounded-full border-4 border-blue-100 flex items-center justify-center">
                            <Loader2 className="size-8 text-blue-600 animate-spin" />
                          </div>
                          <Sparkles className="size-5 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
                        </div>

                        <div className="text-center space-y-1">
                          <p className="text-lg font-semibold text-foreground">
                            {bulkPhase === "uploading" &&
                              `Se incarca facturile... (${bulkProgress.current}/${bulkProgress.total})`}
                            {bulkPhase === "scanning" &&
                              `AI scaneaza facturile... (${bulkProgress.current}/${bulkProgress.total})`}
                            {bulkPhase === "matching" &&
                              "AI potriveste facturile cu tranzactiile..."}
                            {bulkPhase === "saving" &&
                              `Se salveaza rezultatele... (${bulkSavedCount} potrivite)`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {bulkPhase === "uploading" &&
                              "Fisierele sunt incarcate in cloud pentru procesare"}
                            {bulkPhase === "scanning" &&
                              "AI citeste continutul fiecarei facturi si extrage datele"}
                            {bulkPhase === "matching" &&
                              "Algoritmul compara numele furnizorilor si sumele din facturi cu tranzactiile bancare"}
                            {bulkPhase === "saving" &&
                              "Facturile potrivite sunt salvate si asociate cu tranzactiile"}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <Progress
                          value={
                            bulkPhase === "matching"
                              ? 75
                              : bulkPhase === "saving"
                                ? 90
                                : bulkProgress.total > 0
                                  ? (bulkProgress.current / bulkProgress.total) * 70
                                  : 0
                          }
                        />
                        {bulkCurrentFile && (
                          <p className="text-xs text-center text-muted-foreground truncate max-w-md mx-auto">
                            {bulkPhase === "saving" ? "Salvat: " : "Procesare: "}
                            {bulkCurrentFile}
                          </p>
                        )}
                      </div>

                      {/* Step indicators */}
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                          bulkPhase === "uploading"
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {bulkPhase !== "uploading" ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <Loader2 className="size-3 animate-spin" />
                          )}
                          Incarcare
                        </span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                          bulkPhase === "scanning"
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : bulkPhase === "uploading"
                              ? "bg-muted text-muted-foreground"
                              : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {bulkPhase !== "uploading" && bulkPhase !== "scanning" ? (
                            <CheckCircle2 className="size-3" />
                          ) : bulkPhase === "scanning" ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <span className="size-3" />
                          )}
                          Scanare AI
                        </span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                          bulkPhase === "matching"
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : bulkPhase === "saving"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {bulkPhase === "saving" ? (
                            <CheckCircle2 className="size-3" />
                          ) : bulkPhase === "matching" ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <span className="size-3" />
                          )}
                          Potrivire
                        </span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                          bulkPhase === "saving"
                            ? "bg-blue-100 text-blue-700 font-medium"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {bulkPhase === "saving" ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <span className="size-3" />
                          )}
                          Salvare
                        </span>
                      </div>
                    </div>
                  )}

                  {/* DONE — Show results */}
                  {bulkState === "done" && (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          bulkMatchedCount > 0
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-amber-50 border-amber-200"
                        }`}
                      >
                        <CheckCircle2
                          className={`size-5 ${bulkMatchedCount > 0 ? "text-emerald-600" : "text-amber-600"}`}
                        />
                        <div>
                          <p
                            className={`text-sm font-medium ${bulkMatchedCount > 0 ? "text-emerald-700" : "text-amber-700"}`}
                          >
                            {bulkMatchedCount > 0
                              ? `${bulkMatchedCount} facturi potrivite automat`
                              : "Nicio factura nu a putut fi potrivita automat"}
                          </p>
                          {unmatchedInvoices.length > 0 && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              {unmatchedInvoices.length} facturi necesita
                              asociere manuala
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Unmatched invoices */}
                      {unmatchedInvoices.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Facturi neasociate:
                          </p>
                          {unmatchedInvoices.map((inv) => (
                            <div
                              key={inv.fileIndex}
                              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-amber-50/50"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="size-4 text-amber-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {inv.fileName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {inv.ocrData?.partner_name || "Necunoscut"}
                                    {inv.ocrData?.total_amount
                                      ? ` — ${inv.ocrData.total_amount.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={
                                    assignSelections[inv.fileIndex] || ""
                                  }
                                  onValueChange={(v) =>
                                    setAssignSelections((prev) => ({
                                      ...prev,
                                      [inv.fileIndex]: v,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-56">
                                    <SelectValue placeholder="Selecteaza tranzactia" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {detectedTransactions
                                      .filter((t) => !t.invoiceUploaded)
                                      .map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                          {t.description.substring(0, 20)} —{" "}
                                          {t.amount.toLocaleString("ro-RO")}{" "}
                                          {t.currency}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  disabled={!assignSelections[inv.fileIndex]}
                                  onClick={() =>
                                    handleManualBulkAssign(
                                      inv,
                                      assignSelections[inv.fileIndex]
                                    )
                                  }
                                >
                                  Asociaza
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reset button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBulkState("idle");
                          setUnmatchedInvoices([]);
                          setBulkMatchedCount(0);
                          setAssignSelections({});
                          setBulkSavedCount(0);
                          setBulkCurrentFile("");
                        }}
                      >
                        Importa mai multe facturi
                      </Button>
                    </div>
                  )}
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
                      <CardTitle className="text-base">
                        Adauga factura manual
                      </CardTitle>
                      <CardDescription>
                        {detectedTransactions.length === 0
                          ? "Incarca o factura si AI va completa automat campurile"
                          : "Adauga facturi suplimentare care nu apar in extras"}
                      </CardDescription>
                    </div>
                  </div>
                  {!showManualAdd && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowManualAdd(true)}
                    >
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
                      <p className="text-sm text-blue-700">
                        {manualOcrStatus}
                      </p>
                    </div>
                  )}
                  {!manualOcrProcessing && manualOcrStatus && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <p className="text-sm text-emerald-700">
                        {manualOcrStatus}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tip</Label>
                      <Select
                        value={manualType}
                        onValueChange={(v) =>
                          setManualType(v as "received" | "issued")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="received">
                            Primita (cheltuiala)
                          </SelectItem>
                          <SelectItem value="issued">
                            Emisa (venit)
                          </SelectItem>
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

                  {manualError && (
                    <p className="text-sm text-red-600">{manualError}</p>
                  )}
                  {manualSuccess && (
                    <p className="text-sm text-emerald-600">{manualSuccess}</p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      disabled={manualUploading || !period}
                      onClick={handleManualInvoiceUpload}
                    >
                      {manualUploading ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" /> Se
                          incarca...
                        </>
                      ) : (
                        <>
                          <Upload className="size-4 mr-2" /> Incarca factura
                        </>
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

            {/* Bottom actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setOcrStatus("");
                  setStatementError("");
                  setStatementFiles([]);
                  setCurrentStatementId(null);
                  setDetectedTransactions([]);
                  setBulkState("idle");
                  setUnmatchedInvoices([]);
                  setBulkMatchedCount(0);
                  setAssignSelections({});
                  setBulkSavedCount(0);
                  setBulkCurrentFile("");
                  bulkFilesRef.current.clear();
                }}
              >
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

      {/* ==================== DELETE STATEMENT DIALOG ==================== */}
      <Dialog
        open={showDeleteStatementDialog}
        onOpenChange={setShowDeleteStatementDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sterge extrasul de cont?</DialogTitle>
            <DialogDescription>
              Aceasta actiune va sterge extrasul, toate tranzactiile detectate si
              facturile asociate. Actiunea nu poate fi anulata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteStatementDialog(false)}
              disabled={deletingStatement}
            >
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStatement}
              disabled={deletingStatement}
            >
              {deletingStatement && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Sterge definitiv
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
