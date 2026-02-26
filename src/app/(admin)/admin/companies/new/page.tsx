"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/contasync/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { createCompany } from "@/lib/actions/companies";
import { createBankAccount } from "@/lib/actions/bank-accounts";
import { createInvitation } from "@/lib/actions/invitations";

interface BankAccountRow {
  id: string;
  bank_name: string;
  iban: string;
  currency: string;
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [isTvaPayer, setIsTvaPayer] = useState(false);
  const [taxRegime, setTaxRegime] = useState("micro1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([
    { id: "1", bank_name: "", iban: "", currency: "RON" },
  ]);

  const addBankAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), bank_name: "", iban: "", currency: "RON" },
    ]);
  };

  const removeBankAccount = (id: string) => {
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const updateBankAccount = (
    id: string,
    field: keyof BankAccountRow,
    value: string
  ) => {
    setBankAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    formData.set("is_vat_payer", String(isTvaPayer));
    formData.set("tax_regime", taxRegime);

    const result = await createCompany(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Create bank accounts
    for (const account of bankAccounts) {
      if (account.bank_name && account.iban) {
        const baForm = new FormData();
        baForm.set("company_id", result.data!.id);
        baForm.set("bank_name", account.bank_name);
        baForm.set("iban", account.iban);
        baForm.set("currency", account.currency);
        await createBankAccount(baForm);
      }
    }

    // Create invitation if email provided
    const inviteEmail = formData.get("invite_email") as string;
    if (inviteEmail) {
      const invForm = new FormData();
      invForm.set("company_id", result.data!.id);
      invForm.set("email", inviteEmail);
      invForm.set("role", "editor");
      await createInvitation(invForm);
    }

    router.push("/admin/companies");
  }

  return (
    <>
      <DashboardHeader title="Adaugă firmă nouă" userName="" />

      <div className="p-4 lg:p-6 max-w-3xl space-y-6">
        <form action={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Identificare */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identificare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Denumire firmă *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="HIPIXELS SRL"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cui">CUI *</Label>
                  <Input
                    id="cui"
                    name="cui"
                    placeholder="RO12345678"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="j_number">Nr. Registrul Comerțului</Label>
                <Input
                  id="j_number"
                  name="j_number"
                  placeholder="J40/1234/2020"
                />
              </div>
            </CardContent>
          </Card>

          {/* Date fiscale */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date fiscale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Plătitor de TVA</Label>
                  <p className="text-xs text-muted-foreground">
                    Activează dacă firma este plătitoare de TVA
                  </p>
                </div>
                <Switch
                  checked={isTvaPayer}
                  onCheckedChange={setIsTvaPayer}
                />
              </div>
              <div className="space-y-2">
                <Label>Regim fiscal</Label>
                <Select value={taxRegime} onValueChange={setTaxRegime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro1">Micro 1%</SelectItem>
                    <SelectItem value="micro3">Micro 3%</SelectItem>
                    <SelectItem value="profit">Profit 16%</SelectItem>
                    <SelectItem value="pfa">PFA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Adresă</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Str. Victoriei 42"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Oraș</Label>
                  <Input id="city" name="city" placeholder="București" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">Județ</Label>
                  <Input id="county" name="county" placeholder="București" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Reprezentant legal</Label>
                  <Input
                    id="contact_name"
                    name="contact_name"
                    placeholder="Ion Popescu"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telefon</Label>
                  <Input
                    id="contact_phone"
                    name="contact_phone"
                    placeholder="+40 722 123 456"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email firmă</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  placeholder="office@firma.ro"
                />
              </div>
            </CardContent>
          </Card>

          {/* Conturi bancare */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Conturi bancare</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={addBankAccount}
              >
                <Plus className="size-3.5" />
                Adaugă cont
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-end gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 space-y-2">
                    <Label>Bancă</Label>
                    <Input
                      placeholder="ING Bank"
                      value={account.bank_name}
                      onChange={(e) =>
                        updateBankAccount(
                          account.id,
                          "bank_name",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>IBAN</Label>
                    <Input
                      placeholder="RO49INGB..."
                      value={account.iban}
                      onChange={(e) =>
                        updateBankAccount(account.id, "iban", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-28 space-y-2">
                    <Label>Monedă</Label>
                    <Select
                      value={account.currency}
                      onValueChange={(v) =>
                        updateBankAccount(account.id, "currency", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RON">RON</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {bankAccounts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBankAccount(account.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contract */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contract</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">
                  Taxă lunară contabilitate (RON)
                </Label>
                <Input
                  id="monthly_fee"
                  name="monthly_fee"
                  type="number"
                  placeholder="1500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite_email">
                  Invită clientul (email)
                </Label>
                <Input
                  id="invite_email"
                  name="invite_email"
                  type="email"
                  placeholder="client@firma.ro"
                />
                <p className="text-xs text-muted-foreground">
                  Opțional — clientul va primi o invitație pe email
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Submit */}
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="px-8"
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Salvează firma
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/admin/companies">Anulează</Link>
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
