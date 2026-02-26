/**
 * ContaSync — Invoice-to-Transaction Matching Algorithm v2
 *
 * NAME-FIRST approach: matches invoices to bank transactions primarily
 * by searching for counterparty name words in the invoice content.
 *
 * Strategy:
 * 1. Search for bank transaction counterparty words in invoice raw text
 *    (after stripping emails, addresses, and own company info)
 * 2. Compare structured OCR partner_name with transaction description
 * 3. Check known brand↔payment aliases (e.g. Anthropic ↔ CLAUDE.AI)
 * 4. Amount & date used only as small bonus signals
 *
 * Uses greedy best-score-first assignment to avoid double-matching.
 */

import type { InvoiceOCRResult } from "./processor";

// ============================================
// TYPES
// ============================================

export interface MatchableTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  currency: string;
  invoiceUploaded: boolean;
}

export interface ScannedInvoice {
  fileIndex: number;
  fileName: string;
  storagePath: string;
  ocrData: InvoiceOCRResult | null;
  ocrConfidence: number;
  rawText?: string;
}

export interface MatchResult {
  invoice: ScannedInvoice;
  transaction: MatchableTransaction | null;
  score: number;
}

// ============================================
// KNOWN ALIASES
// Brand names that differ between invoice and bank statement
// ============================================

const NAME_ALIASES: [string[], string[]][] = [
  [["anthropic"], ["claude", "claude.ai"]],
  [["openai"], ["chatgpt", "gpt"]],
  [["microsoft"], ["xbox", "microsoft365", "office365"]],
  [["google"], ["youtube", "google cloud", "gcp"]],
  [["apple"], ["app store", "icloud"]],
  [["amazon"], ["aws"]],
  [["meta"], ["facebook", "instagram", "whatsapp"]],
  [["netflix"], ["netflix"]],
  [["spotify"], ["spotify"]],
  [["adobe"], ["adobe"]],
  [["github"], ["github"]],
  [["atlassian"], ["jira", "confluence", "bitbucket"]],
  [["figma"], ["figma"]],
  [["vercel"], ["vercel"]],
  [["cloudflare"], ["cloudflare"]],
  [["hetzner"], ["hetzner"]],
  [["digitalocean"], ["digitalocean"]],
  [["suno"], ["suno"]],
  [["midjourney"], ["midjourney"]],
  [["cursor"], ["cursor"]],
];

// Words to ALWAYS ignore (too common, appear in addresses/metadata/company info)
const SKIP_WORDS = new Set([
  // Legal suffixes
  "srl", "sa", "pfa", "sc", "ifn", "llc", "ltd", "limited", "inc", "pbc",
  "corp", "gmbh", "bv", "nv",
  // Banking terms
  "transfer", "business", "purchase", "pos", "card", "bank", "incoming",
  "funds", "payment", "subscription", "subscr", "banca", "service", "fee",
  "reference", "internal", "instant", "comision",
  // Invoice terms
  "code", "auth", "amount", "settlement", "rate", "date", "value", "fiscal",
  "invoice", "factura", "total", "plata", "nr",
  // Common English words
  "the", "and", "for", "from", "with", "per", "seat", "plan", "plus", "pro",
  // Address/location words (appear in ALL invoices)
  "romania", "bucuresti", "bucharest", "centrala", "brasov", "street",
  "floor", "office", "san", "francisco", "united", "states", "ireland",
  "kingdom",
  // Common generic words that cause false positives
  "game", "games", "pass", "group", "online", "pay", "new", "general",
]);

// ============================================
// HELPERS
// ============================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/s\.?r\.?l\.?/gi, "srl")
    .replace(/s\.?a\.?/gi, "sa")
    .replace(/s\.?c\.?/gi, "")
    .replace(/i\.?f\.?n\.?/gi, "ifn")
    .replace(/p\.?f\.?a\.?/gi, "pfa")
    .replace(/[.\-_,/\\()'"*#\[\]{}@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Get significant words from text (for matching), excluding common/filler words
 * Accepts extra skip words (e.g. own company name words)
 */
function getSignificantWords(
  text: string,
  extraSkip?: Set<string>,
  minLen = 3
): string[] {
  return normalizeText(text)
    .split(" ")
    .filter(
      (w) =>
        w.length >= minLen &&
        !SKIP_WORDS.has(w) &&
        (!extraSkip || !extraSkip.has(w))
    );
}

/**
 * Clean raw text by removing email addresses and common metadata
 * that causes false positives
 */
function cleanRawText(rawText: string): string {
  return rawText
    // Remove email addresses
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "")
    // Remove URLs
    .replace(/https?:\/\/\S+/g, "")
    // Remove IBAN numbers
    .replace(/[A-Z]{2}\d{2}\s?[A-Z0-9]{4,30}/g, "")
    // Remove CUI/CIF numbers
    .replace(/\b(?:RO)?\d{6,10}\b/g, "");
}

function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 999;
  return Math.abs(
    Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
  );
}

// ============================================
// NAME MATCHING
// ============================================

/**
 * Check if two texts share a brand identity via alias table
 */
function checkAliases(text1: string, text2: string): boolean {
  const t1 = text1.toLowerCase();
  const t2 = text2.toLowerCase();

  for (const [group1, group2] of NAME_ALIASES) {
    const allNames = [...group1, ...group2];
    const t1Match = allNames.some((a) => t1.includes(a));
    const t2Match = allNames.some((a) => t2.includes(a));
    if (t1Match && t2Match) return true;
  }
  return false;
}

/**
 * Score how well the transaction counterparty name matches the invoice.
 * Uses multiple signals: structured OCR name, raw text content, filename, aliases.
 *
 * @param selfCompanyWords - Words from the user's own company name to skip
 */
function scoreNameMatch(
  invoice: ScannedInvoice,
  transaction: MatchableTransaction,
  selfCompanyWords: Set<string>
): number {
  const txDesc = transaction.description;
  if (!txDesc) return 0;

  let bestScore = 0;
  const txWords = getSignificantWords(txDesc, selfCompanyWords);
  if (txWords.length === 0) return 0;

  // === Signal 1: Structured OCR partner_name ===
  if (invoice.ocrData?.partner_name) {
    const invoiceName = normalizeText(invoice.ocrData.partner_name);
    const txNorm = normalizeText(txDesc);

    // Full containment
    if (txNorm.includes(invoiceName) || invoiceName.includes(txNorm)) {
      bestScore = Math.max(bestScore, 100);
    } else {
      // Word overlap between OCR name and transaction description
      const invoiceWords = getSignificantWords(
        invoice.ocrData.partner_name,
        selfCompanyWords
      );
      const overlap = invoiceWords.filter((w) =>
        txWords.some((tw) => tw.includes(w) || w.includes(tw))
      );
      if (overlap.length >= 2) {
        bestScore = Math.max(bestScore, 80);
      } else if (overlap.length === 1 && overlap[0].length >= 4) {
        bestScore = Math.max(bestScore, 60);
      }
    }

    // Check aliases between OCR name and transaction description
    if (checkAliases(invoice.ocrData.partner_name, txDesc)) {
      bestScore = Math.max(bestScore, 80);
    }
  }

  // === Signal 2: Search transaction words in cleaned invoice raw text ===
  if (invoice.rawText && invoice.rawText.length > 0) {
    const cleanedRaw = cleanRawText(invoice.rawText);
    const rawLower = cleanedRaw.toLowerCase();

    // How many significant tx words appear in the cleaned invoice text?
    const foundWords = txWords.filter((w) => rawLower.includes(w));

    if (foundWords.length >= 2) {
      bestScore = Math.max(bestScore, 80);
    } else if (foundWords.length === 1 && foundWords[0].length >= 4) {
      bestScore = Math.max(bestScore, 60);
    }

    // Check aliases between raw text and transaction description
    if (checkAliases(cleanedRaw, txDesc)) {
      bestScore = Math.max(bestScore, 80);
    }
  }

  // === Signal 3: Filename-based matching ===
  if (invoice.fileName) {
    const fileWords = getSignificantWords(
      invoice.fileName.replace(/\.(pdf|jpg|png)$/i, ""),
      selfCompanyWords
    );
    const overlap = fileWords.filter((w) =>
      txWords.some((tw) => tw.includes(w) || w.includes(tw))
    );
    if (overlap.length >= 2) {
      bestScore = Math.max(bestScore, 70);
    } else if (overlap.length === 1 && overlap[0].length >= 4) {
      bestScore = Math.max(bestScore, 50);
    }
  }

  return bestScore;
}

// ============================================
// SCORING
// ============================================

function scoreMatch(
  invoice: ScannedInvoice,
  transaction: MatchableTransaction,
  selfCompanyWords: Set<string>
): number {
  let score = 0;

  // 1. Name matching (dominant signal)
  score += scoreNameMatch(invoice, transaction, selfCompanyWords);

  // 2. Amount matching (small bonus — often doesn't match due to currency conversion)
  if (invoice.ocrData?.total_amount && invoice.ocrData.total_amount > 0) {
    const diff = Math.abs(transaction.amount - invoice.ocrData.total_amount);
    if (diff < 0.02) {
      score += 20; // Exact match
    } else if (transaction.amount > 0 && diff / transaction.amount < 0.1) {
      score += 10; // Within 10%
    }
  }

  // 3. Date proximity (small bonus)
  if (invoice.ocrData?.issue_date && transaction.date) {
    const days = daysDifference(invoice.ocrData.issue_date, transaction.date);
    if (days <= 3) score += 10;
    else if (days <= 7) score += 5;
    else if (days <= 30) score += 2;
  }

  return score;
}

// ============================================
// COMMON WORDS DETECTION
// ============================================

/**
 * Find words that appear in most invoices — these are likely own-company
 * info (company name, representative, address) and should be skipped
 * to avoid false matches.
 */
function findCommonInvoiceWords(invoices: ScannedInvoice[]): Set<string> {
  const wordCounts = new Map<string, number>();

  for (const inv of invoices) {
    if (!inv.rawText) continue;
    const cleaned = cleanRawText(inv.rawText);
    // Get unique words per invoice (count each word once per invoice)
    const words = new Set(
      normalizeText(cleaned)
        .split(" ")
        .filter((w) => w.length >= 4 && !SKIP_WORDS.has(w))
    );
    for (const w of words) {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    }
  }

  // Words appearing in >40% of invoices are likely own-company info
  const threshold = Math.max(2, Math.floor(invoices.length * 0.4));
  const commonWords = new Set<string>();
  for (const [word, count] of wordCounts) {
    if (count >= threshold) {
      commonWords.add(word);
    }
  }
  return commonWords;
}

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

/**
 * Match scanned invoices to bank transactions using name-first approach.
 * Greedy best-score-first assignment to avoid double-matching.
 *
 * @param invoices - Scanned invoices with OCR data and raw text
 * @param transactions - Bank transactions from statement
 * @param selfCompanyName - The user's own company name (to filter out false matches)
 */
export function matchInvoicesToTransactions(
  invoices: ScannedInvoice[],
  transactions: MatchableTransaction[],
  selfCompanyName?: string
): MatchResult[] {
  // Build a set of words from the user's own company name
  const selfCompanyWords = new Set<string>();
  if (selfCompanyName) {
    for (const w of getSignificantWords(selfCompanyName)) {
      selfCompanyWords.add(w);
    }
  }

  // Auto-detect words that appear in most invoices (own-company info)
  const commonWords = findCommonInvoiceWords(invoices);
  for (const w of commonWords) {
    selfCompanyWords.add(w);
  }

  // Only consider unmatched transactions
  const available = transactions.filter((t) => !t.invoiceUploaded);

  // Name match must score at least 50 to count
  const MATCH_THRESHOLD = 50;

  // Score all invoice-transaction pairs
  const pairs: {
    invoice: ScannedInvoice;
    transaction: MatchableTransaction;
    score: number;
  }[] = [];

  for (const invoice of invoices) {
    for (const transaction of available) {
      const score = scoreMatch(invoice, transaction, selfCompanyWords);
      if (score >= MATCH_THRESHOLD) {
        pairs.push({ invoice, transaction, score });
      }
    }
  }

  // Sort by score descending (best matches first)
  pairs.sort((a, b) => b.score - a.score);

  // Greedy assignment: each invoice and transaction used at most once
  const assignedInvoices = new Set<number>();
  const assignedTransactions = new Set<string>();
  const results: MatchResult[] = [];

  for (const pair of pairs) {
    if (
      assignedInvoices.has(pair.invoice.fileIndex) ||
      assignedTransactions.has(pair.transaction.id)
    ) {
      continue;
    }
    assignedInvoices.add(pair.invoice.fileIndex);
    assignedTransactions.add(pair.transaction.id);
    results.push(pair);
  }

  // Add unmatched invoices
  for (const invoice of invoices) {
    if (!assignedInvoices.has(invoice.fileIndex)) {
      results.push({ invoice, transaction: null, score: 0 });
    }
  }

  return results;
}
