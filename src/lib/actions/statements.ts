"use server";

import { createClient } from "@/lib/supabase/server";

export async function getStatements(companyId: string, periodId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("bank_statements")
    .select(
      `
      *,
      company_bank_accounts(bank_name, iban, currency)
    `
    )
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false });

  if (periodId) {
    query = query.eq("period_id", periodId);
  }

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: data || [], error: null };
}

export async function uploadStatement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const companyId = formData.get("company_id") as string;
  const periodId = formData.get("period_id") as string;
  const bankAccountId = formData.get("bank_account_id") as string;
  const fileName = formData.get("file_name") as string;
  const fileUrl = formData.get("file_url") as string;
  const fileSize = parseInt((formData.get("file_size") as string) || "0");

  const { data, error } = await supabase
    .from("bank_statements")
    .insert({
      period_id: periodId,
      company_id: companyId,
      bank_account_id: bankAccountId || null,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize,
      uploaded_by: user?.id,
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function deleteStatement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bank_statements")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
