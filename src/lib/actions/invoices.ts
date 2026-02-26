"use server";

import { createClient } from "@/lib/supabase/server";

export async function getInvoices(
  companyId: string,
  options?: { periodId?: string; type?: "received" | "issued" }
) {
  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("*")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false });

  if (options?.periodId) {
    query = query.eq("period_id", options.periodId);
  }
  if (options?.type) {
    query = query.eq("type", options.type);
  }

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: data || [], error: null };
}

export async function uploadInvoice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const invoiceData = {
    period_id: formData.get("period_id") as string,
    company_id: formData.get("company_id") as string,
    type: formData.get("type") as "received" | "issued",
    invoice_number: formData.get("invoice_number") as string,
    partner_name: formData.get("partner_name") as string,
    partner_cui: formData.get("partner_cui") as string,
    issue_date: formData.get("issue_date") as string,
    due_date: (formData.get("due_date") as string) || null,
    amount_without_vat: parseFloat(
      (formData.get("amount_without_vat") as string) || "0"
    ),
    vat_amount: parseFloat((formData.get("vat_amount") as string) || "0"),
    total_amount: parseFloat(
      (formData.get("total_amount") as string) || "0"
    ),
    currency: (formData.get("currency") as string) || "RON",
    file_name: formData.get("file_name") as string,
    file_url: formData.get("file_url") as string,
    uploaded_by: user?.id,
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(invoiceData)
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function updateInvoiceStatus(
  id: string,
  status: "pending" | "validated" | "rejected"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
