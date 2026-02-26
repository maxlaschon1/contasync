"use client";

import { useState, useEffect, useTransition } from "react";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { FileUpload } from "@/components/contasync/FileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileText, Receipt, Loader2 } from "lucide-react";
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

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

export default function UploadPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Data state
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [userName, setUserName] = useState("Client");
  const [loading, setLoading] = useState(true);

  // Statement form state
  const [selectedAccount, setSelectedAccount] = useState("");
  const [statementFiles, setStatementFiles] = useState<File[]>([]);
  const [statementUploading, setStatementUploading] = useState(false);
  const [statementSuccess, setStatementSuccess] = useState("");
  const [statementError, setStatementError] = useState("");

  // Invoice form state
  const [invoiceType, setInvoiceType] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState("");
  const [invoiceError, setInvoiceError] = useState("");

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

  // Upload statement handler
  async function handleStatementUpload() {
    if (!selectedAccount || statementFiles.length === 0 || !company || !period) return;

    setStatementUploading(true);
    setStatementError("");
    setStatementSuccess("");

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

      startTransition(async () => {
        const result = await uploadStatement(formData);
        if (result.error) {
          setStatementError(result.error);
        } else {
          setStatementSuccess("Extrasul a fost incarcat cu succes!");
          setSelectedAccount("");
          setStatementFiles([]);
          router.refresh();
        }
        setStatementUploading(false);
      });
    } catch (err) {
      setStatementError(err instanceof Error ? err.message : "Eroare la incarcare");
      setStatementUploading(false);
    }
  }

  // Upload invoice handler
  async function handleInvoiceUpload() {
    if (!invoiceType || !company || !period) return;

    setInvoiceUploading(true);
    setInvoiceError("");
    setInvoiceSuccess("");

    try {
      let fileUrl = "";
      let fileName = "";

      if (invoiceFiles.length > 0) {
        const file = invoiceFiles[0];
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

      const totalAmount = parseFloat(amount) || 0;
      const vatAmount = Math.round((totalAmount - totalAmount / 1.19) * 100) / 100;
      const amountWithoutVat = Math.round((totalAmount - vatAmount) * 100) / 100;

      const formData = new FormData();
      formData.set("company_id", company.id);
      formData.set("period_id", period.id);
      formData.set("type", invoiceType);
      formData.set("invoice_number", invoiceNumber);
      formData.set("partner_name", partnerName);
      formData.set("partner_cui", "");
      formData.set("issue_date", new Date().toISOString().split("T")[0]);
      formData.set("amount_without_vat", String(amountWithoutVat));
      formData.set("vat_amount", String(vatAmount));
      formData.set("total_amount", String(totalAmount));
      formData.set("currency", "RON");
      formData.set("file_name", fileName);
      formData.set("file_url", fileUrl);

      startTransition(async () => {
        const result = await uploadInvoice(formData);
        if (result.error) {
          setInvoiceError(result.error);
        } else {
          setInvoiceSuccess("Factura a fost incarcata cu succes!");
          setInvoiceType("");
          setInvoiceNumber("");
          setPartnerName("");
          setAmount("");
          setInvoiceFiles([]);
          router.refresh();
        }
        setInvoiceUploading(false);
      });
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Eroare la incarcare");
      setInvoiceUploading(false);
    }
  }

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

      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank Statements Upload */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <FileText className="size-4 text-blue-600" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Extrase de cont
                </CardTitle>
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
                <p className="text-sm text-red-600">{statementError}</p>
              )}
              {statementSuccess && (
                <p className="text-sm text-emerald-600">{statementSuccess}</p>
              )}

              <Button
                className="w-full"
                disabled={!selectedAccount || statementFiles.length === 0 || statementUploading || !period}
                onClick={handleStatementUpload}
              >
                {statementUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Se incarca...
                  </>
                ) : (
                  "Incarca extras"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Invoices Upload */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Receipt className="size-4 text-amber-600" />
                </div>
                <CardTitle className="text-base font-semibold">Facturi</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-type">Tip factura</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType}>
                  <SelectTrigger id="invoice-type">
                    <SelectValue placeholder="Selecteaza tipul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Primita</SelectItem>
                    <SelectItem value="issued">Emisa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-number">Numar factura</Label>
                <Input
                  id="invoice-number"
                  placeholder="ex: FACT-1234"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner-name">
                  {invoiceType === "issued" ? "Nume client" : "Nume furnizor"}
                </Label>
                <Input
                  id="partner-name"
                  placeholder={
                    invoiceType === "issued"
                      ? "ex: ClientCorp SRL"
                      : "ex: Orange Romania SA"
                  }
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Suma (RON)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <FileUpload
                accept=".pdf,.jpg,.png"
                multiple={false}
                label="Trage factura aici sau click pentru a selecta"
                sublabel="PDF, JPG, PNG — max. 10 MB"
                onFilesSelected={(files) => setInvoiceFiles(files)}
              />

              {invoiceError && (
                <p className="text-sm text-red-600">{invoiceError}</p>
              )}
              {invoiceSuccess && (
                <p className="text-sm text-emerald-600">{invoiceSuccess}</p>
              )}

              <Button
                className="w-full"
                disabled={!invoiceType || invoiceUploading || !period}
                onClick={handleInvoiceUpload}
              >
                {invoiceUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Se incarca...
                  </>
                ) : (
                  "Incarca factura"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
