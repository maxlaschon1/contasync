/**
 * ContaSync — Tax Calculator Engine
 * Romanian tax calculations for accounting firms
 */

// TVA rate standard
const TVA_RATE = 0.19;

// Contribuții salariale
const CAS_RATE = 0.25; // Contribuția de asigurări sociale (pensie)
const CASS_RATE = 0.1; // Contribuția de asigurări sociale de sănătate
const CAM_RATE = 0.0225; // Contribuția asiguratorie pentru muncă
const INCOME_TAX_RATE = 0.1; // Impozit pe venit

// Impozit profit / micro
const PROFIT_TAX_RATE = 0.16;
const MICRO_1_RATE = 0.01;
const MICRO_3_RATE = 0.03;

export interface Invoice {
  type: "received" | "issued";
  amount_without_vat: number;
  vat_amount: number;
  total_amount: number;
}

export interface TaxResult {
  tva_collected: number;
  tva_deductible: number;
  tva_due: number;
  cas: number;
  cass: number;
  cam: number;
  income_tax: number;
  profit_tax: number;
  total_due: number;
}

export interface SalaryContributions {
  gross_salary: number;
  cas: number;
  cass: number;
  income_tax: number;
  cam: number;
  net_salary: number;
  total_employer_cost: number;
}

/**
 * Calculate TVA (Value Added Tax) from invoices
 */
export function calculateTVA(invoices: Invoice[]): {
  collected: number;
  deductible: number;
  due: number;
} {
  const issued = invoices.filter((i) => i.type === "issued");
  const received = invoices.filter((i) => i.type === "received");

  const collected = issued.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);
  const deductible = received.reduce(
    (sum, inv) => sum + (inv.vat_amount || 0),
    0
  );
  const due = Math.max(0, collected - deductible);

  return {
    collected: round(collected),
    deductible: round(deductible),
    due: round(due),
  };
}

/**
 * Calculate salary contributions for an employee
 */
export function calculateSalaryContributions(
  grossSalary: number
): SalaryContributions {
  const cas = grossSalary * CAS_RATE;
  const cass = grossSalary * CASS_RATE;
  const taxableBase = grossSalary - cas - cass;
  const incomeTax = taxableBase * INCOME_TAX_RATE;
  const cam = grossSalary * CAM_RATE;

  const netSalary = grossSalary - cas - cass - incomeTax;
  const totalEmployerCost = grossSalary + cam;

  return {
    gross_salary: round(grossSalary),
    cas: round(cas),
    cass: round(cass),
    income_tax: round(incomeTax),
    cam: round(cam),
    net_salary: round(netSalary),
    total_employer_cost: round(totalEmployerCost),
  };
}

/**
 * Calculate profit tax or micro-enterprise tax
 */
export function calculateProfitTax(
  income: number,
  expenses: number,
  regime: "micro1" | "micro3" | "profit" | "pfa"
): { income_tax: number; profit_tax: number } {
  switch (regime) {
    case "micro1":
      return { income_tax: round(income * MICRO_1_RATE), profit_tax: 0 };
    case "micro3":
      return { income_tax: round(income * MICRO_3_RATE), profit_tax: 0 };
    case "profit":
      return {
        income_tax: 0,
        profit_tax: round(Math.max(0, (income - expenses) * PROFIT_TAX_RATE)),
      };
    case "pfa":
      return {
        income_tax: round(
          Math.max(0, (income - expenses) * INCOME_TAX_RATE)
        ),
        profit_tax: 0,
      };
    default:
      return { income_tax: 0, profit_tax: 0 };
  }
}

/**
 * Full tax calculation for a period
 */
export function calculateTotal(
  invoices: Invoice[],
  regime: "micro1" | "micro3" | "profit" | "pfa",
  isVatPayer: boolean,
  employeeCount: number = 0,
  averageGrossSalary: number = 5000
): TaxResult {
  // TVA
  const tva = calculateTVA(invoices);

  // Income/expenses from invoices
  const issued = invoices.filter((i) => i.type === "issued");
  const received = invoices.filter((i) => i.type === "received");
  const totalIncome = issued.reduce(
    (sum, inv) => sum + (inv.amount_without_vat || 0),
    0
  );
  const totalExpenses = received.reduce(
    (sum, inv) => sum + (inv.amount_without_vat || 0),
    0
  );

  // Profit/income tax
  const profitCalc = calculateProfitTax(totalIncome, totalExpenses, regime);

  // Salary contributions
  let totalCas = 0;
  let totalCass = 0;
  let totalCam = 0;
  let totalIncomeTax = 0;

  for (let i = 0; i < employeeCount; i++) {
    const salary = calculateSalaryContributions(averageGrossSalary);
    totalCas += salary.cas;
    totalCass += salary.cass;
    totalCam += salary.cam;
    totalIncomeTax += salary.income_tax;
  }

  const tvaDue = isVatPayer ? tva.due : 0;
  const totalDue =
    tvaDue +
    profitCalc.income_tax +
    profitCalc.profit_tax +
    totalCas +
    totalCass +
    totalCam +
    totalIncomeTax;

  return {
    tva_collected: tva.collected,
    tva_deductible: tva.deductible,
    tva_due: round(tvaDue),
    cas: round(totalCas),
    cass: round(totalCass),
    cam: round(totalCam),
    income_tax: round(profitCalc.income_tax + totalIncomeTax),
    profit_tax: round(profitCalc.profit_tax),
    total_due: round(totalDue),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
