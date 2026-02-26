// ============================================
// ContaSync — Database Types
// ============================================

export type UserRole = "admin" | "client";
export type CompanyUserRole = "owner" | "member";
export type PeriodStatus = "open" | "pending_review" | "completed" | "locked";
export type OcrStatus = "pending" | "processing" | "completed" | "failed";
export type InvoiceType = "received" | "issued" | "accounting_service";
export type InvoiceStatus = "uploaded" | "verified" | "rejected" | "missing";
export type MatchStatus = "unmatched" | "auto_matched" | "manual_matched" | "ignored";
export type TaxRegime = "micro_1" | "micro_3" | "profit";
export type TaxStatus = "draft" | "calculated" | "verified" | "submitted";
export type Currency = "RON" | "EUR" | "USD";

export type NotificationType =
  | "missing_statement"
  | "missing_invoice"
  | "period_reminder"
  | "invoice_uploaded"
  | "statement_uploaded"
  | "taxes_calculated"
  | "service_invoice"
  | "general";

// ── Users ──
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ── Companies ──
export interface Company {
  id: string;
  name: string;
  cui: string;
  registration_number?: string;
  is_tva_payer: boolean;
  tva_registration_date?: string;
  caen_code?: string;
  employee_count: number;
  address?: string;
  city?: string;
  county?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  legal_representative?: string;
  admin_id: string;
  monthly_fee?: number;
  contract_start_date?: string;
  notes?: string;
  gdrive_folder_id?: string;
  created_at: string;
  updated_at: string;
}

// ── Bank Accounts ──
export interface BankAccount {
  id: string;
  company_id: string;
  bank_name: string;
  iban: string;
  currency: Currency;
  is_primary: boolean;
  created_at: string;
}

// ── Company Users ──
export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyUserRole;
  invited_at: string;
  accepted_at?: string;
}

// ── Monthly Periods ──
export interface MonthlyPeriod {
  id: string;
  company_id: string;
  year: number;
  month: number;
  status: PeriodStatus;
  bank_statements_uploaded: boolean;
  all_invoices_uploaded: boolean;
  accountant_reviewed: boolean;
  taxes_calculated: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── Bank Statements ──
export interface BankStatement {
  id: string;
  period_id: string;
  company_id: string;
  bank_account_id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  gdrive_file_id?: string;
  statement_date?: string;
  opening_balance?: number;
  closing_balance?: number;
  currency?: string;
  total_debits?: number;
  total_credits?: number;
  ocr_status: OcrStatus;
  ocr_raw_data?: Record<string, unknown>;
  uploaded_by: string;
  uploaded_at: string;
}

// ── Bank Transactions ──
export interface BankTransaction {
  id: string;
  statement_id: string;
  transaction_date?: string;
  description?: string;
  reference_number?: string;
  debit: number;
  credit: number;
  balance_after?: number;
  matched_invoice_id?: string;
  match_status: MatchStatus;
  match_confidence?: number;
  created_at: string;
}

// ── Invoices ──
export interface Invoice {
  id: string;
  period_id: string;
  company_id: string;
  type: InvoiceType;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  supplier_name?: string;
  supplier_cui?: string;
  client_name?: string;
  client_cui?: string;
  subtotal?: number;
  tva_rate?: number;
  tva_amount?: number;
  total?: number;
  currency: Currency;
  file_name?: string;
  file_url?: string;
  gdrive_file_id?: string;
  ocr_status: OcrStatus | "none";
  ocr_raw_data?: Record<string, unknown>;
  status: InvoiceStatus;
  uploaded_by?: string;
  uploaded_at?: string;
  verified_by?: string;
  verified_at?: string;
}

// ── Monthly Taxes ──
export interface MonthlyTax {
  id: string;
  period_id: string;
  company_id: string;
  tva_collected: number;
  tva_deductible: number;
  tva_to_pay: number;
  cas_employee: number;
  cass_employee: number;
  income_tax: number;
  cam: number;
  profit_tax: number;
  tax_regime?: TaxRegime;
  total_state_budget: number;
  status: TaxStatus;
  calculated_at?: string;
  calculated_by?: string;
  notes?: string;
  created_at: string;
}

// ── Notifications ──
export interface Notification {
  id: string;
  recipient_id: string;
  company_id?: string;
  period_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  is_email_sent: boolean;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

// ── Invitations ──
export interface Invitation {
  id: string;
  company_id: string;
  email: string;
  token: string;
  role: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

// ── Aggregated / View Types ──
export interface CompanyWithStatus extends Company {
  period_status?: PeriodStatus;
  statements_count?: number;
  invoices_count?: number;
  missing_docs?: number;
  users?: User[];
}

export interface DashboardStats {
  total_companies: number;
  complete_this_month: number;
  pending_this_month: number;
  incomplete_this_month: number;
  total_alerts: number;
}

export interface ClientDashboardStats {
  statements_uploaded: number;
  statements_required: number;
  invoices_uploaded: number;
  invoices_required: number;
  unread_notifications: number;
}

export interface MonthlyPeriodWithDocs extends MonthlyPeriod {
  statements: BankStatement[];
  invoices: Invoice[];
  taxes?: MonthlyTax;
}
