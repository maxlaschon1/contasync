/**
 * ContaSync — Invoice-to-Transaction Matching Algorithm
 *
 * Scores each scanned invoice against each unmatched transaction
 * using amount, partner name, and date signals. Uses greedy
 * assignment (highest score first) to avoid double-matching.
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
}

export interface MatchResult {
  invoice: ScannedInvoice;
  transaction: MatchableTransaction | null;
  score: number;
}

// ============================================
// HELPERS
// ============================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/s\.?r\.?l\.?/gi, "srl")
    .replace(/s\.?a\.?/gi, "sa")
    .replace(/s\.?c\.?/gi, "")
    .replace(/p\.?f\.?a\.?/gi, "pfa")
    .replace(/[.\-_,/\\()'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
// SCORING
// ============================================

function scoreMatch(
  invoice: ScannedInvoice,
  transaction: MatchableTransaction
): number {
  const ocr = invoice.ocrData;
  if (!ocr) return 0;

  let score = 0;

  // 1. Amount matching (strongest signal)
  if (ocr.total_amount && ocr.total_amount > 0) {
    const diff = Math.abs(transaction.amount - ocr.total_amount);
    if (diff < 0.02) {
      score += 50; // Exact match
    } else if (transaction.amount > 0 && diff / transaction.amount < 0.05) {
      score += 30; // Within 5%
    }
  }

  // 2. Partner name matching
  if (ocr.partner_name && transaction.description) {
    const invoiceName = normalizeText(ocr.partner_name);
    const txDesc = normalizeText(transaction.description);

    // Full containment
    if (txDesc.includes(invoiceName) || invoiceName.includes(txDesc)) {
      score += 30;
    } else {
      // Partial: check if significant words overlap
      const invoiceWords = invoiceName
        .split(" ")
        .filter((w) => w.length >= 3);
      const txWords = txDesc.split(" ").filter((w) => w.length >= 3);
      const overlap = invoiceWords.filter((w) =>
        txWords.some((tw) => tw.includes(w) || w.includes(tw))
      );
      if (overlap.length > 0) {
        score += 15;
      }
    }
  }

  // 3. Date proximity
  if (ocr.issue_date && transaction.date) {
    const days = daysDifference(ocr.issue_date, transaction.date);
    if (days === 0) score += 20;
    else if (days <= 3) score += 15;
    else if (days <= 7) score += 10;
    else if (days <= 30) score += 5;
  }

  return score;
}

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

/**
 * Match scanned invoices to bank transactions using a greedy
 * best-score-first approach. Returns matched and unmatched invoices.
 *
 * @param invoices - Invoices with OCR data from bulk scan
 * @param transactions - Detected transactions from bank statement
 * @returns Array of match results (matched have transaction, unmatched have null)
 */
export function matchInvoicesToTransactions(
  invoices: ScannedInvoice[],
  transactions: MatchableTransaction[]
): MatchResult[] {
  // Only consider unmatched transactions
  const available = transactions.filter((t) => !t.invoiceUploaded);

  // Score all invoice-transaction pairs above threshold
  const MATCH_THRESHOLD = 40;
  const pairs: {
    invoice: ScannedInvoice;
    transaction: MatchableTransaction;
    score: number;
  }[] = [];

  for (const invoice of invoices) {
    for (const transaction of available) {
      const score = scoreMatch(invoice, transaction);
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
