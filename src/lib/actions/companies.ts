"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCompanies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      *,
      company_users(count),
      monthly_periods(id, status, year, month),
      bank_statements(count),
      invoices(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };

  // Enrich with computed fields
  const enriched = (data || []).map((company) => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentPeriod = company.monthly_periods?.find(
      (p: { year: number; month: number }) =>
        p.year === currentYear && p.month === currentMonth
    );

    return {
      ...company,
      period_status: currentPeriod?.status || "open",
      statements_count: company.bank_statements?.[0]?.count || 0,
      invoices_count: company.invoices?.[0]?.count || 0,
    };
  });

  return { data: enriched, error: null };
}

export async function getCompany(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      *,
      company_bank_accounts(*),
      company_users(*, profiles:user_id(*))
    `
    )
    .eq("id", id)
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function createCompany(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const companyData = {
    name: formData.get("name") as string,
    cui: formData.get("cui") as string,
    j_number: formData.get("j_number") as string,
    address: formData.get("address") as string,
    city: formData.get("city") as string,
    county: formData.get("county") as string,
    is_vat_payer: formData.get("is_vat_payer") === "true",
    tax_regime: formData.get("tax_regime") as string,
    contact_name: formData.get("contact_name") as string,
    contact_email: formData.get("contact_email") as string,
    contact_phone: formData.get("contact_phone") as string,
    monthly_fee: parseFloat((formData.get("monthly_fee") as string) || "0"),
    created_by: user?.id,
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(companyData)
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  // Create current month period
  const now = new Date();
  await supabase.from("monthly_periods").insert({
    company_id: data.id,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  return { data, error: null };
}

export async function updateCompany(id: string, formData: FormData) {
  const supabase = await createClient();

  const updateData = {
    name: formData.get("name") as string,
    cui: formData.get("cui") as string,
    j_number: formData.get("j_number") as string,
    address: formData.get("address") as string,
    city: formData.get("city") as string,
    county: formData.get("county") as string,
    is_vat_payer: formData.get("is_vat_payer") === "true",
    tax_regime: formData.get("tax_regime") as string,
    contact_name: formData.get("contact_name") as string,
    contact_email: formData.get("contact_email") as string,
    contact_phone: formData.get("contact_phone") as string,
    monthly_fee: parseFloat((formData.get("monthly_fee") as string) || "0"),
  };

  const { error } = await supabase
    .from("companies")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getCompanyStats() {
  const supabase = await createClient();
  const { data: companies } = await supabase.from("companies").select("id");
  const now = new Date();

  const { data: periods } = await supabase
    .from("monthly_periods")
    .select("status, company_id")
    .eq("year", now.getFullYear())
    .eq("month", now.getMonth() + 1);

  const total = companies?.length || 0;
  const completed =
    periods?.filter((p) => p.status === "completed").length || 0;
  const pending =
    periods?.filter((p) => p.status === "pending_review").length || 0;
  const incomplete = total - completed - pending;

  return {
    total_companies: total,
    complete_this_month: completed,
    pending_this_month: pending,
    incomplete_this_month: incomplete < 0 ? 0 : incomplete,
  };
}
