-- ============================================
-- ContaSync — Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. COMPANIES
-- ============================================
CREATE TABLE public.companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  cui TEXT NOT NULL UNIQUE,
  j_number TEXT,
  address TEXT,
  city TEXT,
  county TEXT,
  is_vat_payer BOOLEAN DEFAULT false,
  tax_regime TEXT DEFAULT 'micro1' CHECK (tax_regime IN ('micro1', 'micro3', 'profit', 'pfa')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  monthly_fee NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on companies"
  ON public.companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view their companies"
  ON public.companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_id = companies.id AND user_id = auth.uid()
    )
  );

-- ============================================
-- 3. COMPANY BANK ACCOUNTS
-- ============================================
CREATE TABLE public.company_bank_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bank_name TEXT NOT NULL,
  iban TEXT NOT NULL,
  currency TEXT DEFAULT 'RON' CHECK (currency IN ('RON', 'EUR', 'USD')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bank accounts"
  ON public.company_bank_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view their bank accounts"
  ON public.company_bank_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.company_bank_accounts ba ON ba.company_id = cu.company_id
      WHERE cu.user_id = auth.uid() AND ba.id = company_bank_accounts.id
    )
  );

-- ============================================
-- 4. COMPANY USERS (many-to-many)
-- ============================================
CREATE TABLE public.company_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company_users"
  ON public.company_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their company memberships"
  ON public.company_users FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- 5. MONTHLY PERIODS
-- ============================================
CREATE TABLE public.monthly_periods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending_review', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, year, month)
);

ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage periods"
  ON public.monthly_periods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view their periods"
  ON public.monthly_periods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = monthly_periods.company_id AND cu.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. BANK STATEMENTS
-- ============================================
CREATE TABLE public.bank_statements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  period_id UUID REFERENCES public.monthly_periods(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bank_account_id UUID REFERENCES public.company_bank_accounts(id),
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INT,
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage statements"
  ON public.bank_statements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can manage their statements"
  ON public.bank_statements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = bank_statements.company_id AND cu.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. BANK TRANSACTIONS (from OCR)
-- ============================================
CREATE TABLE public.bank_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  statement_id UUID REFERENCES public.bank_statements(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  transaction_date DATE,
  description TEXT,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'RON',
  type TEXT CHECK (type IN ('credit', 'debit')),
  match_status TEXT DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'unmatched', 'ignored')),
  matched_invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage transactions"
  ON public.bank_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view their transactions"
  ON public.bank_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = bank_transactions.company_id AND cu.user_id = auth.uid()
    )
  );

-- ============================================
-- 8. INVOICES
-- ============================================
CREATE TABLE public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  period_id UUID REFERENCES public.monthly_periods(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('received', 'issued')),
  invoice_number TEXT,
  partner_name TEXT,
  partner_cui TEXT,
  issue_date DATE,
  due_date DATE,
  amount_without_vat NUMERIC(12,2),
  vat_amount NUMERIC(12,2),
  total_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'RON',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  file_name TEXT,
  file_url TEXT,
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can manage their invoices"
  ON public.invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = invoices.company_id AND cu.user_id = auth.uid()
    )
  );

-- ============================================
-- 9. MONTHLY TAXES
-- ============================================
CREATE TABLE public.monthly_taxes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  period_id UUID REFERENCES public.monthly_periods(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  tva_collected NUMERIC(12,2) DEFAULT 0,
  tva_deductible NUMERIC(12,2) DEFAULT 0,
  tva_due NUMERIC(12,2) DEFAULT 0,
  cas NUMERIC(12,2) DEFAULT 0,
  cass NUMERIC(12,2) DEFAULT 0,
  cam NUMERIC(12,2) DEFAULT 0,
  income_tax NUMERIC(12,2) DEFAULT 0,
  profit_tax NUMERIC(12,2) DEFAULT 0,
  total_due NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'submitted', 'paid')),
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, company_id)
);

ALTER TABLE public.monthly_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage taxes"
  ON public.monthly_taxes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view their taxes"
  ON public.monthly_taxes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = monthly_taxes.company_id AND cu.user_id = auth.uid()
    )
  );

-- ============================================
-- 10. NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('missing_docs', 'period_complete', 'tax_due', 'invitation', 'general')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 11. INVITATIONS
-- ============================================
CREATE TABLE public.invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON public.invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view invitation by token"
  ON public.invitations FOR SELECT
  USING (true);

-- ============================================
-- 12. STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can access all documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can upload to their company folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND (storage.foldername(name))[1] = cu.company_id::text
    )
  );

CREATE POLICY "Clients can view their company documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND (storage.foldername(name))[1] = cu.company_id::text
    )
  );

-- ============================================
-- 13. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_monthly_periods_updated_at
  BEFORE UPDATE ON public.monthly_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_monthly_taxes_updated_at
  BEFORE UPDATE ON public.monthly_taxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX idx_monthly_periods_company ON public.monthly_periods(company_id, year, month);
CREATE INDEX idx_bank_statements_period ON public.bank_statements(period_id);
CREATE INDEX idx_bank_statements_company ON public.bank_statements(company_id);
CREATE INDEX idx_invoices_period ON public.invoices(period_id);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
