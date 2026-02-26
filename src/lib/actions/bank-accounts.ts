"use server";

import { createClient } from "@/lib/supabase/server";

export async function getBankAccounts(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_bank_accounts")
    .select("*")
    .eq("company_id", companyId)
    .order("is_primary", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data || [], error: null };
}

export async function createBankAccount(formData: FormData) {
  const supabase = await createClient();

  const accountData = {
    company_id: formData.get("company_id") as string,
    bank_name: formData.get("bank_name") as string,
    iban: formData.get("iban") as string,
    currency: (formData.get("currency") as string) || "RON",
    is_primary: formData.get("is_primary") === "true",
  };

  const { data, error } = await supabase
    .from("company_bank_accounts")
    .insert(accountData)
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function deleteBankAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_bank_accounts")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
