"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

  // Use service role for insert (ensures it works regardless of RLS)
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
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

export async function insertTransactions(
  transactions: Array<{
    statement_id: string;
    company_id: string;
    transaction_date: string;
    description: string;
    amount: number;
    type: string;
    currency: string;
  }>
) {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("bank_transactions")
    .insert(transactions)
    .select("id");

  if (error) return { error: error.message, data: null };
  return { data: data || [], error: null };
}

export async function deleteTransaction(id: string) {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("bank_transactions")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getUnmatchedTransactions(
  companyId: string,
  periodId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_transactions")
    .select(
      `
      *,
      bank_statements!inner(
        period_id,
        company_bank_accounts(bank_name)
      )
    `
    )
    .eq("company_id", companyId)
    .eq("bank_statements.period_id", periodId)
    .eq("match_status", "unmatched")
    .order("transaction_date", { ascending: true });

  if (error) return { error: error.message, data: [] };
  return { data: data || [], error: null };
}

export async function updateTransactionMatch(
  transactionId: string,
  invoiceId: string
) {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("bank_transactions")
    .update({
      match_status: "matched",
      matched_invoice_id: invoiceId,
    })
    .eq("id", transactionId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteStatement(id: string) {
  const serviceClient = createServiceClient();

  // Get statement for storage cleanup
  const { data: statement } = await serviceClient
    .from("bank_statements")
    .select("file_url")
    .eq("id", id)
    .single();

  // Delete statement (ON DELETE CASCADE removes bank_transactions)
  const { error } = await serviceClient
    .from("bank_statements")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  // Delete storage file
  if (statement?.file_url) {
    await serviceClient.storage
      .from("documents")
      .remove([statement.file_url]);
  }

  return { success: true };
}
