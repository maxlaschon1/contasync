-- ============================================
-- FIX: RLS Infinite Recursion on profiles
--
-- Problem: Admin policies on profiles (and all other tables)
-- check profiles.role which triggers the profiles SELECT policy
-- which again checks profiles.role → infinite recursion.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS
-- to check admin status, then update all policies to use it.
-- ============================================

-- Step 1: Create SECURITY DEFINER function to check admin status
-- This function runs with the privileges of the function creator (superuser),
-- bypassing RLS entirely, so it can read profiles without triggering policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Also create a helper to get current user's company IDs
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM public.company_users
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Step 2: Fix PROFILES policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Users can always see their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles (using is_admin() to avoid recursion)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Allow the trigger to insert profiles for new users
CREATE POLICY "Service can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Step 3: Fix COMPANIES policies
-- ============================================
DROP POLICY IF EXISTS "Admins can do everything on companies" ON public.companies;
DROP POLICY IF EXISTS "Clients can view their companies" ON public.companies;

CREATE POLICY "Admins can do everything on companies"
  ON public.companies FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view their companies"
  ON public.companies FOR SELECT
  USING (
    id IN (SELECT public.get_user_company_ids())
  );

-- ============================================
-- Step 4: Fix COMPANY_BANK_ACCOUNTS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.company_bank_accounts;
DROP POLICY IF EXISTS "Clients can view their bank accounts" ON public.company_bank_accounts;

CREATE POLICY "Admins can manage bank accounts"
  ON public.company_bank_accounts FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view their bank accounts"
  ON public.company_bank_accounts FOR SELECT
  USING (
    company_id IN (SELECT public.get_user_company_ids())
  );

-- ============================================
-- Step 5: Fix COMPANY_USERS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their company memberships" ON public.company_users;

CREATE POLICY "Admins can manage company_users"
  ON public.company_users FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view their company memberships"
  ON public.company_users FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- Step 6: Fix MONTHLY_PERIODS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage periods" ON public.monthly_periods;
DROP POLICY IF EXISTS "Clients can view their periods" ON public.monthly_periods;

CREATE POLICY "Admins can manage periods"
  ON public.monthly_periods FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view their periods"
  ON public.monthly_periods FOR SELECT
  USING (
    company_id IN (SELECT public.get_user_company_ids())
  );

-- ============================================
-- Step 7: Fix BANK_STATEMENTS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage statements" ON public.bank_statements;
DROP POLICY IF EXISTS "Clients can manage their statements" ON public.bank_statements;

CREATE POLICY "Admins can manage statements"
  ON public.bank_statements FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can manage their statements"
  ON public.bank_statements FOR ALL
  USING (
    company_id IN (SELECT public.get_user_company_ids())
  );

-- ============================================
-- Step 8: Fix BANK_TRANSACTIONS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Clients can view their transactions" ON public.bank_transactions;

CREATE POLICY "Admins can manage transactions"
  ON public.bank_transactions FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view their transactions"
  ON public.bank_transactions FOR SELECT
  USING (
    company_id IN (SELECT public.get_user_company_ids())
  );

-- ============================================
-- Step 9: Fix INVOICES policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Clients can manage their invoices" ON public.invoices;

CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can manage their invoices"
  ON public.invoices FOR ALL
  USING (
    company_id IN (SELECT public.get_user_company_ids())
  );

-- ============================================
-- Step 10: Fix MONTHLY_TAXES policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage taxes" ON public.monthly_taxes;
DROP POLICY IF EXISTS "Clients can view their taxes" ON public.monthly_taxes;

CREATE POLICY "Admins can manage taxes"
  ON public.monthly_taxes FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view their taxes"
  ON public.monthly_taxes FOR SELECT
  USING (
    company_id IN (SELECT public.get_user_company_ids())
  );

-- ============================================
-- Step 11: Fix NOTIFICATIONS policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can also view all notifications (for admin panel)
CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (public.is_admin());

-- ============================================
-- Step 12: Fix INVITATIONS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

CREATE POLICY "Admins can manage invitations"
  ON public.invitations FOR ALL
  USING (public.is_admin());

-- Anyone (even anonymous) can view invitations by token for the signup flow
CREATE POLICY "Anyone can view invitation by token"
  ON public.invitations FOR SELECT
  USING (true);

-- ============================================
-- Step 13: Fix STORAGE policies
-- ============================================
DROP POLICY IF EXISTS "Admins can access all documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view their company documents" ON storage.objects;

CREATE POLICY "Admins can access all documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'documents' AND public.is_admin()
  );

CREATE POLICY "Clients can upload to their company folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_company_ids())
  );

CREATE POLICY "Clients can view their company documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_company_ids())
  );

-- ============================================
-- Done! All policies now use is_admin() instead
-- of directly querying profiles, breaking the
-- infinite recursion cycle.
-- ============================================
