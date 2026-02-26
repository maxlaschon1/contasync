"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCurrentPeriod(companyId: string) {
  const supabase = await createClient();
  const now = new Date();

  const { data, error } = await supabase
    .from("monthly_periods")
    .select("*")
    .eq("company_id", companyId)
    .eq("year", now.getFullYear())
    .eq("month", now.getMonth() + 1)
    .single();

  if (error && error.code === "PGRST116") {
    // No period exists, create one
    const { data: newPeriod } = await supabase
      .from("monthly_periods")
      .insert({
        company_id: companyId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      })
      .select()
      .single();
    return { data: newPeriod, error: null };
  }

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function getPeriodHistory(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("monthly_periods")
    .select(
      `
      *,
      bank_statements(count),
      invoices(count),
      monthly_taxes(total_due, status)
    `
    )
    .eq("company_id", companyId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(12);

  if (error) return { error: error.message, data: [] };

  const enriched = (data || []).map((period) => ({
    ...period,
    statements_count: period.bank_statements?.[0]?.count || 0,
    invoices_count: period.invoices?.[0]?.count || 0,
    tax_total: period.monthly_taxes?.[0]?.total_due || 0,
    tax_status: period.monthly_taxes?.[0]?.status || "draft",
  }));

  return { data: enriched, error: null };
}

export async function updatePeriodStatus(
  periodId: string,
  status: "open" | "pending_review" | "completed"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_periods")
    .update({ status })
    .eq("id", periodId);

  if (error) return { error: error.message };
  return { success: true };
}
