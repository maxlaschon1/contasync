"use server";

import { createClient } from "@/lib/supabase/server";

export async function getTaxes(companyId: string, periodId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_taxes")
    .select("*")
    .eq("company_id", companyId)
    .eq("period_id", periodId)
    .single();

  if (error && error.code === "PGRST116") {
    return { data: null, error: null }; // No taxes calculated yet
  }
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function calculateTaxes(companyId: string, periodId: string) {
  const supabase = await createClient();

  // Get company info for tax regime
  const { data: company } = await supabase
    .from("companies")
    .select("is_vat_payer, tax_regime")
    .eq("id", companyId)
    .single();

  // Get invoices for this period
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("company_id", companyId)
    .eq("period_id", periodId);

  const received = invoices?.filter((i) => i.type === "received") || [];
  const issued = invoices?.filter((i) => i.type === "issued") || [];

  // Calculate TVA
  const tvaCollected = issued.reduce(
    (sum, inv) => sum + (inv.vat_amount || 0),
    0
  );
  const tvaDeductible = received.reduce(
    (sum, inv) => sum + (inv.vat_amount || 0),
    0
  );
  const tvaDue = company?.is_vat_payer
    ? Math.max(0, tvaCollected - tvaDeductible)
    : 0;

  // Calculate income
  const totalIncome = issued.reduce(
    (sum, inv) => sum + (inv.amount_without_vat || 0),
    0
  );
  const totalExpenses = received.reduce(
    (sum, inv) => sum + (inv.amount_without_vat || 0),
    0
  );

  // Tax based on regime
  let incomeTax = 0;
  let profitTax = 0;

  switch (company?.tax_regime) {
    case "micro1":
      incomeTax = totalIncome * 0.01;
      break;
    case "micro3":
      incomeTax = totalIncome * 0.03;
      break;
    case "profit":
      profitTax = Math.max(0, (totalIncome - totalExpenses) * 0.16);
      break;
    case "pfa":
      incomeTax = Math.max(0, (totalIncome - totalExpenses) * 0.1);
      break;
  }

  // Salary contributions (simplified — per employee placeholder)
  const cas = totalIncome > 0 ? totalIncome * 0.25 * 0.1 : 0; // ~simplified
  const cass = totalIncome > 0 ? totalIncome * 0.1 * 0.1 : 0;
  const cam = totalIncome > 0 ? totalIncome * 0.0225 * 0.1 : 0;

  const totalDue = tvaDue + incomeTax + profitTax + cas + cass + cam;

  const taxData = {
    period_id: periodId,
    company_id: companyId,
    tva_collected: tvaCollected,
    tva_deductible: tvaDeductible,
    tva_due: tvaDue,
    cas: Math.round(cas * 100) / 100,
    cass: Math.round(cass * 100) / 100,
    cam: Math.round(cam * 100) / 100,
    income_tax: Math.round(incomeTax * 100) / 100,
    profit_tax: Math.round(profitTax * 100) / 100,
    total_due: Math.round(totalDue * 100) / 100,
    status: "calculated" as const,
    calculated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("monthly_taxes")
    .upsert(taxData, { onConflict: "period_id,company_id" })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function updateTaxStatus(
  id: string,
  status: "draft" | "calculated" | "submitted" | "paid"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_taxes")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
