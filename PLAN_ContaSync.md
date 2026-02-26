# ContaSync — Plan de Implementare

## Aplicație de Colaborare Contabilitate ↔ Client

**Versiune:** 1.0
**Data:** 26 Februarie 2026
**Autor:** Plan generat pentru implementare în Claude Code

---

## 1. VIZIUNE GENERALĂ

**ContaSync** este o platformă web unde firmele de contabilitate administrează clienții (firme), iar clienții încarcă lunar documente contabile (extrase de cont, facturi). Sistemul oferă OCR pentru parsarea automată a extraselor de cont, notificări pentru documente lipsă, calcul automat de taxe, și stocare opțională pe Google Drive.

### Roluri în sistem

| Rol | Descriere |
|-----|-----------|
| **Admin (Contabila)** | Firma de contabilitate. Adaugă firme, monitorizează documente, trimite alerte, încarcă facturi de servicii, calculează taxe. |
| **Client (Firma)** | Firma administrală. Încarcă extrase de cont și facturi lunar, vizualizează statusul, primește notificări. |

---

## 2. TECH STACK RECOMANDAT

### Varianta recomandată: Next.js + Supabase

| Componentă | Tehnologie | Motivație |
|-------------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router, RSC) | SSR, routing, middleware auth |
| **Styling** | Tailwind CSS 4 + shadcn/ui | UI profesional rapid |
| **Backend / DB** | Supabase (PostgreSQL) | Auth, DB, Storage, Realtime — toate built-in |
| **Auth** | Supabase Auth | Email/parolă + magic links + invite system |
| **Storage** | Supabase Storage + Google Drive API | Documente locale + sync opțional GDrive |
| **OCR** | Google Document AI (free tier) | 1,000 pag/lună gratuit — parsare PDF extrase de cont |
| **OCR Fallback** | Tesseract.js (open source) | Gratuit complet, rulează local, fallback dacă depășești limita |
| **Email** | Resend (free) sau Nodemailer + Gmail SMTP | 3,000 emails/lună gratuit (Resend) sau 500/zi (Gmail SMTP) |
| **Deploy** | Vercel (free tier) | 100GB bandwidth gratuit, subdomeniu .vercel.app inclus |

### De ce Supabase peste custom backend?

Supabase **este** PostgreSQL. Ai acces direct la baza de date SQL, poți scrie queries complexe, joins, views, stored procedures — tot ce face un backend custom. Dar în plus primești gratuit: auth cu JWT, storage pentru fișiere (S3-compatible), realtime subscriptions, Row Level Security (RLS) pentru securitate la nivel de rând. Asta înseamnă **3-4 săptămâni economizite** față de a construi totul de la zero.

### Varianta alternativă: Full Custom

Dacă preferi control total:

| Componentă | Tehnologie |
|-------------|-----------|
| Frontend | Next.js 15 |
| Backend | Node.js + Express / Fastify |
| DB | PostgreSQL (hosted pe Railway / Neon) |
| Auth | Passport.js + JWT |
| Storage | AWS S3 / MinIO |
| ORM | Prisma sau Drizzle |

Diferența principală: ~4 săptămâni în plus de development pentru auth, storage, API endpoints, middleware. Recomandat doar dacă ai cerințe foarte specifice de infrastructure.

---

## 3. SCHEMA BAZEI DE DATE

### 3.1 Tabele principale

```sql
-- ============================================
-- USERS (autentificare și profil)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FIRME (companii administrate)
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Date identificare
  name TEXT NOT NULL,                    -- Denumire firmă
  cui TEXT UNIQUE NOT NULL,              -- Cod Unic de Identificare
  registration_number TEXT,              -- Nr. Reg. Comerțului (J40/1234/2020)

  -- Date bancare (poate avea mai multe conturi)
  -- -> vezi tabel company_bank_accounts

  -- Date fiscale
  is_tva_payer BOOLEAN DEFAULT false,    -- Plătitor de TVA
  tva_registration_date DATE,            -- Data înregistrării ca plătitor TVA
  caen_code TEXT,                        -- Cod CAEN principal

  -- Date angajați
  employee_count INTEGER DEFAULT 0,      -- Număr angajați

  -- Date contact
  address TEXT,
  city TEXT,
  county TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  legal_representative TEXT,             -- Reprezentant legal

  -- Administrare
  admin_id UUID REFERENCES users(id),   -- Contabila care administrează
  monthly_fee DECIMAL(10,2),             -- Taxa lunară de contabilitate
  contract_start_date DATE,
  notes TEXT,

  -- Google Drive
  gdrive_folder_id TEXT,                 -- ID folder Google Drive (opțional)

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CONTURI BANCARE (o firmă poate avea mai multe)
-- ============================================
CREATE TABLE company_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,               -- Numele băncii
  iban TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('RON', 'EUR', 'USD')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- UTILIZATORI ↔ FIRME (un client poate avea mai multe firme)
-- ============================================
CREATE TABLE company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(company_id, user_id)
);

-- ============================================
-- PERIOADE LUNARE (o "lună contabilă" per firmă)
-- ============================================
CREATE TABLE monthly_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending_review', 'completed', 'locked')),

  -- Statusuri documente
  bank_statements_uploaded BOOLEAN DEFAULT false,
  all_invoices_uploaded BOOLEAN DEFAULT false,
  accountant_reviewed BOOLEAN DEFAULT false,

  -- Taxe calculate
  taxes_calculated BOOLEAN DEFAULT false,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, year, month)
);

-- ============================================
-- EXTRASE DE CONT (Bank Statements)
-- ============================================
CREATE TABLE bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES monthly_periods(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  bank_account_id UUID REFERENCES company_bank_accounts(id),

  -- Fișier
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,                -- URL în Supabase Storage
  file_size INTEGER,
  gdrive_file_id TEXT,                   -- ID Google Drive (dacă sincronizat)

  -- Date extrase din OCR
  statement_date DATE,
  opening_balance DECIMAL(15,2),
  closing_balance DECIMAL(15,2),
  currency TEXT,
  total_debits DECIMAL(15,2),
  total_credits DECIMAL(15,2),

  -- OCR Status
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_raw_data JSONB,                   -- Date brute din OCR

  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRANZACȚII DIN EXTRAS (extrase prin OCR)
-- ============================================
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID REFERENCES bank_statements(id) ON DELETE CASCADE,

  transaction_date DATE,
  description TEXT,
  reference_number TEXT,                 -- Număr referință/document
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  balance_after DECIMAL(15,2),

  -- Matching cu facturi
  matched_invoice_id UUID REFERENCES invoices(id),
  match_status TEXT DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'auto_matched', 'manual_matched', 'ignored')),
  match_confidence DECIMAL(3,2),         -- 0.00 - 1.00 (pentru auto-match)

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FACTURI
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES monthly_periods(id),
  company_id UUID REFERENCES companies(id),

  -- Tip factură
  type TEXT NOT NULL CHECK (type IN (
    'received',           -- Factură primită (de la furnizori)
    'issued',             -- Factură emisă (către clienți)
    'accounting_service'  -- Factură de servicii contabilitate
  )),

  -- Date factură
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,

  -- Părți
  supplier_name TEXT,                    -- Cine a emis
  supplier_cui TEXT,
  client_name TEXT,                      -- Către cine
  client_cui TEXT,

  -- Sume
  subtotal DECIMAL(15,2),               -- Sumă fără TVA
  tva_rate DECIMAL(5,2),                -- Procent TVA (19%, 9%, 5%, 0%)
  tva_amount DECIMAL(15,2),             -- Sumă TVA
  total DECIMAL(15,2),                  -- Total cu TVA
  currency TEXT DEFAULT 'RON',

  -- Fișier
  file_name TEXT,
  file_url TEXT,
  gdrive_file_id TEXT,

  -- OCR
  ocr_status TEXT DEFAULT 'none' CHECK (ocr_status IN ('none', 'pending', 'processing', 'completed', 'failed')),
  ocr_raw_data JSONB,

  -- Status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'rejected', 'missing')),

  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ
);

-- ============================================
-- CALCUL TAXE LUNARE
-- ============================================
CREATE TABLE monthly_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES monthly_periods(id),
  company_id UUID REFERENCES companies(id),

  -- TVA
  tva_collected DECIMAL(15,2) DEFAULT 0,     -- TVA colectat (din facturi emise)
  tva_deductible DECIMAL(15,2) DEFAULT 0,    -- TVA deductibil (din facturi primite)
  tva_to_pay DECIMAL(15,2) DEFAULT 0,        -- TVA de plată (colectat - deductibil)

  -- Contribuții angajați
  cas_employee DECIMAL(15,2) DEFAULT 0,      -- CAS angajat (25%)
  cass_employee DECIMAL(15,2) DEFAULT 0,     -- CASS angajat (10%)
  income_tax DECIMAL(15,2) DEFAULT 0,        -- Impozit pe venit (10%)
  cam DECIMAL(15,2) DEFAULT 0,               -- CAM angajator (2.25%)

  -- Impozit pe profit / micro
  profit_tax DECIMAL(15,2) DEFAULT 0,        -- Impozit pe profit (16%) sau micro (1%/3%)
  tax_regime TEXT CHECK (tax_regime IN ('micro_1', 'micro_3', 'profit')),

  -- Buget de stat total
  total_state_budget DECIMAL(15,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'verified', 'submitted')),
  calculated_at TIMESTAMPTZ,
  calculated_by UUID REFERENCES users(id),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ALERTE / NOTIFICĂRI
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Destinatar
  recipient_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  period_id UUID REFERENCES monthly_periods(id),

  -- Conținut
  type TEXT NOT NULL CHECK (type IN (
    'missing_statement',     -- Extras de cont lipsă
    'missing_invoice',       -- Factură lipsă
    'period_reminder',       -- Reminder general pentru luna X
    'invoice_uploaded',      -- Factură nouă încărcată
    'statement_uploaded',    -- Extras încărcat
    'taxes_calculated',      -- Taxe calculate
    'service_invoice',       -- Factură servicii contabilitate
    'general'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_email_sent BOOLEAN DEFAULT false,

  -- Referință opțională
  reference_type TEXT,                   -- 'invoice', 'statement', etc.
  reference_id UUID,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INVITAȚII
-- ============================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Diagrama relațiilor

```
users ──────────┬──────── company_users ──────── companies
                │                                    │
                │                              ┌─────┼──────────────┐
                │                              │     │              │
                │                    bank_accounts   │              │
                │                              │     │              │
                │                    bank_statements │      monthly_periods
                │                              │     │         │    │
                │                    bank_transactions│        │    │
                │                              │     │         │    │
                │                              └──── invoices ─┘    │
                │                                    │              │
                │                              monthly_taxes ───────┘
                │
                └──────── notifications
                          invitations
```

---

## 4. FUNCȚIONALITĂȚI DETALIATE

### 4.1 Sistem de Autentificare & Invitații

**Flux de înregistrare contabilitate (Admin):**
1. Admin se înregistrează cu email + parolă
2. Primește confirmare pe email
3. Accesează dashboard-ul de admin

**Flux de invitare client:**
1. Admin adaugă firmă nouă în sistem
2. Admin introduce email-ul persoanei de contact
3. Sistemul generează un link de invitație cu token unic (expiră în 7 zile)
4. Clientul primește email cu link
5. Click pe link → pagină de signup pre-populată cu email și firma asociată
6. Clientul își creează contul → automat asociat la firmă
7. Admin vede clientul activ în lista firmei

**Securitate:**
- Parole hashed cu bcrypt
- JWT tokens cu refresh
- Rate limiting pe login (max 5 încercări / 15 min)
- Middleware de protecție pe toate rutele autentificate

---

### 4.2 Dashboard Client

#### Pagina principală — `/dashboard`

```
┌─────────────────────────────────────────────────────┐
│  ContaSync         [Firma: HIPIXELS SRL ▼]  [User] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Luna curentă: Februarie 2026                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ 📄 Extrase   │  │ 🧾 Facturi   │  │ ⚠️ Alerte │ │
│  │ 2/3 încărcate│  │ 5/8 încărcate│  │ 3 noi     │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                     │
│  ═══════════════════════════════════════════════     │
│                                                     │
│  EXTRASE DE CONT                    [+ Încarcă]     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ING Bank RON    ✅ Încărcat  │ 25 Feb 2026  │    │
│  │ ING Bank EUR    ✅ Încărcat  │ 25 Feb 2026  │    │
│  │ BT Bank RON     ❌ Lipsă     │ —             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  FACTURI NECESARE (din analiza extras)              │
│  ┌─────────────────────────────────────────────┐    │
│  │ Fact. #1234 - Orange SA     ✅ │ 520.00 RON │    │
│  │ Fact. #5678 - Enel          ✅ │ 180.00 RON │    │
│  │ Fact. #9012 - Emag          ❌ │ 1,250.00   │    │
│  │ → [Încarcă factura]                          │    │
│  │ Fact. necunoscută           ❌ │ 340.00 RON │    │
│  │ → [Încarcă factura]                          │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ISTORIC LUNI                                       │
│  [Ian 2026 ✅] [Dec 2025 ✅] [Nov 2025 ⚠️] ...    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Funcționalități:**
- **Selector firmă** — dacă utilizatorul are mai multe firme
- **Status cards** — overview rapid pentru luna curentă
- **Upload extrase** — drag & drop sau click, acceptă PDF
- **Facturi auto-detectate** — după OCR pe extras, sistemul creează câmpuri de upload pentru fiecare tranzacție care pare a fi o factură
- **Istoric lunare** — timeline cu statusul fiecărei luni (complet, incomplet, în lucru)

#### Upload extras de cont — Flux detaliat

1. Clientul selectează contul bancar (ING RON, BT EUR, etc.)
2. Drag & drop PDF-ul extrasului
3. Fișierul se uploadează în Supabase Storage
4. Se trimite la serviciul OCR (async job)
5. OCR procesează PDF-ul și extrage:
   - Data extrasului
   - Sold inițial / final
   - Lista tranzacțiilor (dată, descriere, sumă, referință)
6. Sistemul analizează tranzacțiile și identifică:
   - Plăți care par a fi facturi (sume rotunde, descrieri cu "fact", "inv", nume furnizori cunoscuți)
   - Încasări de la clienți
7. Se creează automat câmpuri de upload pentru facturile identificate
8. Clientul încarcă facturile corespunzătoare
9. Sistemul face matching automat (sumă + descriere + dată)

#### Istoric facturi — `/dashboard/history`

- Tabel cu toate facturile încărcate
- Filtre: lună, tip (primită/emisă), status, furnizor
- Search după număr factură sau furnizor
- Export CSV

---

### 4.3 Dashboard Admin (Contabilitate)

#### Pagina principală — `/admin`

```
┌─────────────────────────────────────────────────────┐
│  ContaSync ADMIN                            [User]  │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ FIRME    │  Februarie 2026 — Overview               │
│          │                                          │
│ ✅ Glow  │  ┌────────────────────────────────────┐  │
│ ⚠️ Hipix │  │ Firme totale:     12               │  │
│ ✅ TechCo│  │ Complete luna:     7  ██████░░ 58% │  │
│ ❌ AlphaX│  │ În așteptare:      3               │  │
│ ...      │  │ Incomplete:        2               │  │
│          │  └────────────────────────────────────┘  │
│ [+Firmă] │                                          │
│          │  FIRME CU DOCUMENTE LIPSĂ                │
│ RAPOARTE │  ┌────────────────────────────────────┐  │
│ SETĂRI   │  │ HIPIXELS   │ Extras RON lipsă      │  │
│          │  │            │ 2 facturi lipsă        │  │
│          │  │            │ [Trimite alertă]       │  │
│          │  ├────────────────────────────────────┤  │
│          │  │ AlphaX     │ Nimic încărcat         │  │
│          │  │            │ [Trimite alertă]       │  │
│          │  └────────────────────────────────────┘  │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

#### Adăugare firmă nouă — `/admin/companies/new`

**Câmpuri formular:**

| Secțiune | Câmpuri |
|----------|---------|
| **Identificare** | Denumire firmă*, CUI* (cu validare ANAF), Nr. Reg. Comerțului |
| **Fiscal** | Plătitor TVA (da/nu)*, Data înregistrare TVA, Cod CAEN, Regim fiscal (micro 1% / micro 3% / profit) |
| **Angajați** | Număr angajați*, Fond total salarii brute |
| **Contact** | Adresă, Oraș, Județ, Cod poștal, Telefon, Email*, Website |
| **Legal** | Reprezentant legal, Funcție |
| **Conturi bancare** | [+ Adaugă cont] → Bancă, IBAN, Monedă (RON/EUR/USD) |
| **Contract** | Taxă lunară contabilitate, Data început contract |
| **Integrare** | Google Drive folder ID (opțional) |

*Câmpuri obligatorii marcate cu **

**Funcție specială — Validare CUI:** La introducerea CUI, sistemul poate interoga API-ul ANAF (openapi.anaf.ro) pentru a pre-popula automat: denumire firmă, adresă, status TVA, cod CAEN.

#### Vizualizare firmă — `/admin/companies/[id]`

- **Tab Documente** — exact ce vede și clientul, dar cu opțiuni admin (verificare, respingere)
- **Tab Facturi** — toate facturile, cu opțiune de verificare/respingere
- **Tab Taxe** — calcul automat + override manual
- **Tab Alerte** — istoric alerte trimise + buton de trimitere
- **Tab Setări firmă** — editare date firmă
- **Tab Facturi servicii** — facturile emise de contabilitate către client

#### Sistem de alerte — Detaliu

Contabila poate trimite alerte:
1. **Manual** — click pe "Trimite alertă" cu mesaj personalizat
2. **Automat** — se configurează reguli:
   - Dacă extrasul nu e încărcat până pe data de 10 → alertă automată
   - Dacă sunt facturi lipsă după OCR → alertă automată
   - Reminder general pe data de 5 a fiecărei luni

**Canale de notificare:**
- In-app (badge cu număr pe clopotel)
- Email (template frumos cu detalii)
- Opțional: WhatsApp Business API (viitor)

#### Facturare servicii contabilitate

1. Admin selectează firma
2. Click "Emite factură servicii"
3. Se pre-populează: date firmă, taxă lunară din contract, luna
4. Admin poate ajusta suma sau adăuga servicii extra
5. Se generează PDF factură
6. Se trimite automat clientului (email + notificare in-app)
7. Clientul o vede în dashboard-ul său la secțiunea "Facturi primite"

---

### 4.4 OCR & Recunoaștere Automată

#### Tehnologie recomandată (strategie free-first)

**Primar — Google Cloud Document AI (FREE: 1,000 pag/lună)**
- Specializat pe documente financiare
- Parsare structurată (extrage automat tabele cu tranzacții)
- Acuratețe excelentă pe extrase bancare românești
- 1,000 pagini/lună gratuit = ~20-30 firme confortabil

**Fallback — Tesseract.js (GRATUIT COMPLET, open source)**
- Rulează direct în Node.js pe serverul tău
- Zero costuri, zero dependențe externe
- Acuratețe decentă pe extrase cu layout tabelar clar
- Se activează automat dacă limita Document AI e atinsă
- Necesită mai mult cod de post-processing

**Opțional viitor — Claude API cu Vision**
- Foarte bun la înțelegerea documentelor complexe
- ~$0.01-0.03 per pagină (pay-as-you-go)
- Util ca upgrade dacă Tesseract nu e suficient de precis

#### Flux OCR pentru extrase de cont

```
Upload PDF
    │
    ▼
Supabase Storage (salvare fișier)
    │
    ▼
Edge Function / API Route (trigger OCR)
    │
    ▼
Google Document AI (free: 1k pag/lună)
    │                  ↘ fallback: Tesseract.js (gratuit)
    ▼
Parsare răspuns → Extragere tranzacții
    │
    ▼
Pentru fiecare tranzacție:
    ├── Sumă > prag minim?
    ├── Descriere conține "fact" / "inv" / nume furnizor?
    ├── Este plată (debit)?
    │
    ▼
Creare "invoice_slots" (câmpuri de upload)
    │
    ▼
Notificare client: "Am detectat X facturi de încărcat"
    │
    ▼
Client uploadează facturi
    │
    ▼
Auto-matching (sumă ±2% + dată ±5 zile)
    │
    ▼
Status: matched / unmatched
```

#### Matching automat facturi ↔ tranzacții

Algoritmul de matching folosește:
1. **Sumă** — diferență maximă 2% (pentru comisioane bancare)
2. **Dată** — tranzacția la ±5 zile de data facturii
3. **Descriere** — fuzzy match pe numele furnizorului
4. **Confidence score** — 0.0 - 1.0, se marchează automat doar dacă > 0.85

---

### 4.5 Calcul Automat Taxe

#### TVA (pentru plătitori)

```
TVA Colectat    = Σ TVA din facturi EMISE
TVA Deductibil  = Σ TVA din facturi PRIMITE
TVA de Plată    = TVA Colectat - TVA Deductibil
                  (dacă negativ → TVA de recuperat)
```

#### Contribuții angajați (per angajat, din salariu brut)

| Contribuție | Procent | Cine plătește |
|-------------|---------|---------------|
| CAS (pensie) | 25% | Angajat |
| CASS (sănătate) | 10% | Angajat |
| Impozit pe venit | 10% | Angajat (din net calculat) |
| CAM | 2.25% | Angajator |

**Formula simplificată:**
```
Salariu brut = X
CAS = X × 25%
CASS = X × 10%
Baza impozit = X - CAS - CASS
Impozit venit = Baza × 10%
Salariu net = X - CAS - CASS - Impozit
CAM (angajator) = X × 2.25%
```

#### Impozit pe profit / Impozit micro

| Regim | Calcul |
|-------|--------|
| Micro fără angajați (3%) | Venituri totale × 3% |
| Micro cu angajați (1%) | Venituri totale × 1% |
| Profit (16%) | (Venituri - Cheltuieli) × 16% |

#### Total buget de stat

```
Total = TVA de plată
      + CAS total angajați
      + CASS total angajați
      + Impozit venit total
      + CAM total
      + Impozit profit/micro
```

**Notă importantă:** Acestea sunt calcule orientative. Contabila verifică și ajustează manual înainte de depunere. Sistemul oferă un punct de plecare, nu înlocuiește expertiza contabilă.

---

### 4.6 Integrare Google Drive

#### Flux

1. Admin configurează OAuth2 cu Google (la setup-ul aplicației)
2. La adăugarea firmei, admin poate specifica un Google Drive folder
3. La fiecare upload de document:
   - Se salvează în Supabase Storage (primar)
   - Se copiază async în Google Drive (subfolder: `{FirmaName}/{An}/{Luna}/`)
4. Structura pe Drive:
   ```
   ContaSync/
   └── HIPIXELS SRL/
       └── 2026/
           └── 02 - Februarie/
               ├── Extrase/
               │   ├── ING_RON_Feb2026.pdf
               │   └── ING_EUR_Feb2026.pdf
               └── Facturi/
                   ├── Fact_1234_Orange.pdf
                   ├── Fact_5678_Enel.pdf
                   └── ...
   ```

---

## 5. STRUCTURA APLICAȚIEI (Next.js)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── invite/[token]/page.tsx
│   │   └── layout.tsx               # Layout auth (centrat, minimal)
│   │
│   ├── (dashboard)/                  # Client routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Overview luna curentă
│   │   │   ├── history/page.tsx      # Istoric lunare
│   │   │   ├── upload/page.tsx       # Upload extrase & facturi
│   │   │   ├── invoices/page.tsx     # Lista facturi
│   │   │   ├── notifications/page.tsx
│   │   │   └── settings/page.tsx     # Profil & setări
│   │   └── layout.tsx                # Layout client (sidebar + header)
│   │
│   ├── (admin)/                      # Admin routes
│   │   ├── admin/
│   │   │   ├── page.tsx              # Overview toate firmele
│   │   │   ├── companies/
│   │   │   │   ├── page.tsx          # Lista firme
│   │   │   │   ├── new/page.tsx      # Adaugă firmă
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Detalii firmă
│   │   │   │       ├── documents/page.tsx
│   │   │   │       ├── invoices/page.tsx
│   │   │   │       ├── taxes/page.tsx
│   │   │   │       ├── alerts/page.tsx
│   │   │   │       └── settings/page.tsx
│   │   │   ├── reports/page.tsx      # Rapoarte globale
│   │   │   └── settings/page.tsx     # Setări contabilitate
│   │   └── layout.tsx                # Layout admin (sidebar + header)
│   │
│   ├── api/
│   │   ├── auth/[...supabase]/route.ts
│   │   ├── ocr/process/route.ts      # Trigger OCR processing
│   │   ├── gdrive/sync/route.ts      # Google Drive sync
│   │   ├── taxes/calculate/route.ts  # Calcul taxe
│   │   ├── invoices/
│   │   │   ├── upload/route.ts
│   │   │   └── match/route.ts
│   │   ├── notifications/
│   │   │   ├── send/route.ts
│   │   │   └── email/route.ts
│   │   └── companies/
│   │       └── validate-cui/route.ts # Validare ANAF
│   │
│   ├── layout.tsx
│   └── page.tsx                      # Landing page
│
├── components/
│   ├── ui/                           # shadcn/ui
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── InviteAccept.tsx
│   ├── dashboard/
│   │   ├── MonthOverview.tsx
│   │   ├── StatementUpload.tsx
│   │   ├── InvoiceUpload.tsx
│   │   ├── InvoiceList.tsx
│   │   ├── MonthlyTimeline.tsx
│   │   └── NotificationBell.tsx
│   ├── admin/
│   │   ├── CompanyForm.tsx
│   │   ├── CompanyCard.tsx
│   │   ├── CompanyDetail.tsx
│   │   ├── TaxCalculator.tsx
│   │   ├── AlertSender.tsx
│   │   ├── ServiceInvoiceGenerator.tsx
│   │   └── GlobalOverview.tsx
│   └── shared/
│       ├── FileUpload.tsx            # Drag & drop component
│       ├── StatusBadge.tsx
│       ├── MonthPicker.tsx
│       └── CurrencyDisplay.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── middleware.ts             # Auth middleware
│   ├── ocr/
│   │   ├── document-ai.ts           # Google Document AI
│   │   ├── parser.ts                # Parse OCR response
│   │   └── matcher.ts               # Invoice-transaction matching
│   ├── gdrive/
│   │   ├── client.ts                # Google Drive API client
│   │   └── sync.ts                  # Upload & organize files
│   ├── taxes/
│   │   ├── calculator.ts            # Tax calculation engine
│   │   ├── tva.ts                   # TVA specific
│   │   └── salary.ts                # Salary contributions
│   ├── email/
│   │   ├── client.ts                # Resend/SendGrid client
│   │   └── templates.ts             # Email templates
│   └── utils.ts
│
├── hooks/
│   ├── useCompany.ts
│   ├── usePeriod.ts
│   ├── useNotifications.ts
│   └── useAuth.ts
│
└── types/
    ├── database.ts                   # Types generate din Supabase
    ├── ocr.ts
    └── taxes.ts
```

---

## 6. PAȘI DE IMPLEMENTARE

### Faza 1 — Fundație (Săptămâna 1-2)
1. Setup proiect Next.js 15 + Tailwind + shadcn/ui
2. Setup Supabase (DB + Auth + Storage)
3. Creare schema DB (toate tabelele)
4. Implementare auth (login, signup, invite flow)
5. Middleware de protecție rute (admin vs client)
6. Layout-uri (auth, client dashboard, admin dashboard)
7. Landing page simplă

### Faza 2 — Admin Core (Săptămâna 3-4)
1. CRUD firme (adaugă, editează, listează, șterge)
2. Validare CUI cu ANAF API
3. Gestiune conturi bancare per firmă
4. Sistem invitații (generare link, email, acceptare)
5. Overview admin cu statusuri pe firme
6. Formular adăugare firmă complet

### Faza 3 — Client Dashboard (Săptămâna 4-5)
1. Dashboard client cu overview luna curentă
2. Component upload fișiere (drag & drop)
3. Upload & stocare extrase de cont
4. Upload & stocare facturi
5. Istoric lunare cu timeline
6. Lista facturi cu filtre și search

### Faza 4 — OCR & Matching (Săptămâna 6-7)
1. Integrare Google Document AI
2. Procesare async extrase de cont
3. Parsare tranzacții din OCR response
4. Algoritm de detecție facturi din tranzacții
5. Generare automată câmpuri de upload
6. Algoritm de matching facturi ↔ tranzacții
7. UI pentru matching manual (drag & drop sau select)

### Faza 5 — Notificări & Alerte (Săptămâna 7-8)
1. Sistem notificări in-app
2. Template-uri email (Resend)
3. Alertă manuală de la admin
4. Alerte automate (documente lipsă)
5. Reminder-uri configurabile
6. NotificationBell component cu badge

### Faza 6 — Taxe & Facturare (Săptămâna 8-9)
1. Engine calcul TVA
2. Engine calcul contribuții salariale
3. Engine calcul impozit profit/micro
4. UI calculator taxe cu breakdown
5. Generator factură servicii contabilitate (PDF)
6. Trimitere factură către client

### Faza 7 — Google Drive (Săptămâna 9-10)
1. Setup Google OAuth2 pentru Drive API
2. Creare structură foldere automat
3. Sync la upload (Supabase → Drive)
4. Link-uri directe către fișiere pe Drive
5. Setări per firmă (folder ID)

### Faza 8 — Polish & Launch (Săptămâna 10-11)
1. Responsive design (mobile-friendly)
2. Error handling & loading states peste tot
3. Validări formular comprehensive
4. Rate limiting & security headers
5. Testing end-to-end
6. Deploy pe Vercel + Supabase production

---

## 7. ESTIMARE EFORT

| Fază | Durată | Complexitate |
|------|--------|-------------|
| Fundație | 2 săptămâni | Medie |
| Admin Core | 2 săptămâni | Medie |
| Client Dashboard | 1.5 săptămâni | Medie |
| OCR & Matching | 2 săptămâni | Ridicată |
| Notificări | 1 săptămână | Medie |
| Taxe & Facturare | 1.5 săptămâni | Ridicată |
| Google Drive | 1 săptămână | Medie |
| Polish & Launch | 1.5 săptămâni | Medie |
| **TOTAL** | **~11-12 săptămâni** | — |

**Notă:** Cu Supabase, fazele 1-3 se pot comprima semnificativ. Cu backend custom, adaugă 3-4 săptămâni.

---

## 8. CONSIDERAȚII IMPORTANTE

### Securitate
- Row Level Security (RLS) în Supabase — fiecare client vede DOAR datele firmelor sale
- Admin vede doar firmele pe care le administrează
- Fișierele sunt private (signed URLs cu expirare)
- CSRF protection pe toate formularele
- Input sanitization pe toate câmpurile

### GDPR & Date personale
- Datele sunt stocate în UE (Supabase EU region)
- Politică de ștergere date la cerere
- Encryption at rest și in transit
- Audit log pentru acțiuni sensibile

### Scalabilitate
- Supabase scalează automat (PostgreSQL managed)
- OCR processing async (nu blochează UI-ul)
- File storage cu CDN
- Caching pe queries frecvente

### Costuri estimate (lunar)

#### Varianta GRATUITĂ (recomandată pentru start)

| Serviciu | Plan | Cost | Limite free tier |
|----------|------|------|-----------------|
| Supabase | Free | $0 | 500MB DB, 1GB storage, 50k useri, 500MB bandwidth |
| Vercel | Hobby (Free) | $0 | 100GB bandwidth, subdomeniu .vercel.app |
| Google Document AI | Free tier | $0 | 1,000 pagini/lună |
| Tesseract.js | Open source | $0 | Nelimitat (fallback OCR) |
| Resend | Free | $0 | 3,000 emailuri/lună |
| Google Drive API | Free | $0 | Practic nelimitat |
| **TOTAL LUNAR** | — | **$0/lună** | **Suficient pentru ~20-30 firme** |

**Notă:** Free tier-urile sunt suficiente pentru un portofoliu de 20-30 firme cu ~80-100 documente/lună. Zero costuri de infrastructură la start.

#### Upgrade când crești (50+ firme)

| Serviciu | Plan | Cost |
|----------|------|------|
| Supabase | Pro | $25/lună |
| Vercel | Pro | $20/lună |
| Document AI | Pay-as-you-go | ~$15/lună |
| Resend | Growth | $20/lună |
| **TOTAL** | — | **~$80/lună** |

---

## 9. DEZVOLTĂRI VIITOARE (Post-MVP)

- Dashboard analytics (grafice venituri/cheltuieli pe luni)
- Export declarații fiscale (D300, D100, D112)
- Integrare directă cu e-Factura (ANAF)
- Integrare cu software de salarizare
- WhatsApp Business API pentru notificări
- Mobile app (React Native)
- Multi-contabilitate (mai multe firme de contabilitate pe platformă)
- Rapoarte financiare automate (P&L, balanță, bilanț)
- AI assistant pentru întrebări contabile frecvente
