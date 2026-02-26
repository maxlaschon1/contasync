/**
 * ContaSync — OCR/AI Document Processor
 * Extracts structured data from Romanian invoices and bank statements
 * Uses pdf-parse for PDF text extraction + intelligent pattern matching
 */

// Import the actual parser directly — pdf-parse/index.js has a debug-mode
// check (module.parent === null) that tries to load a test PDF on Vercel
// serverless and crashes. Importing lib/pdf-parse.js skips that.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse");

export interface InvoiceOCRResult {
  invoice_number?: string;
  partner_name?: string;
  partner_cui?: string;
  issue_date?: string;
  due_date?: string;
  amount_without_vat?: number;
  vat_amount?: number;
  total_amount?: number;
  currency?: string;
}

export interface BankTransactionResult {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  currency: string;
}

export interface OCRResult {
  success: boolean;
  data: InvoiceOCRResult | null;
  transactions?: BankTransactionResult[];
  confidence: number;
  raw_text: string;
  file_type: "invoice" | "statement";
}

/**
 * Download file from URL and return as Buffer
 */
async function downloadFile(fileUrl: string): Promise<Buffer> {
  const response = await fetch(fileUrl);
  if (!response.ok)
    throw new Error(`Failed to download file: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Extract text from a PDF buffer
 */
async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (err) {
    console.error("[OCR] PDF parse error:", err);
    return "";
  }
}

/**
 * Parse a Romanian-format number (1.234,56 or 1,234.56)
 */
function parseRomanianNumber(str: string): number {
  if (!str) return 0;
  let clean = str.replace(/\s/g, "");

  // Romanian: 1.234,56 (dots=thousands, comma=decimal)
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(clean)) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  // US: 1,234.56
  else if (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(clean)) {
    clean = clean.replace(/,/g, "");
  }
  // Simple comma decimal: 1234,56
  else if (/^\d+(,\d{1,2})$/.test(clean)) {
    clean = clean.replace(",", ".");
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a Romanian invoice from extracted text
 */
function parseInvoice(text: string): {
  data: InvoiceOCRResult;
  confidence: number;
} {
  const result: InvoiceOCRResult = {};
  let matchCount = 0;
  const totalFields = 8;

  const normalized = text.replace(/\s+/g, " ").trim();

  // 1. Invoice number
  const invoicePatterns = [
    /(?:factur[aă]\s*(?:nr\.?|num[aă]r\.?|seria?\s*\w+\s*nr\.?)\s*)(\S+)/i,
    /(?:nr\.?\s*factur[aă]\s*)(\S+)/i,
    /(?:seria?\s+)([A-Z]{1,4})\s*(?:nr\.?\s*)(\d+)/i,
    /(?:FACT|FV|FC|FF|FP)[- ]?(\d{1,10})/i,
    // English patterns (OpenAI, Anthropic, Suno, Microsoft)
    // Handles concatenated format from pdf-parse: "Invoice number6D2TJNFQ 0004"
    /(?:invoice\s*(?:no\.?|number|#|num)\.?\s*:?\s*)([A-Z0-9][\w-]*(?:\s?\w+)?)/i,
    /(?:receipt\s*(?:no\.?|number|#)\.?\s*:?\s*)([A-Z0-9][\w-]*(?:\s?\w+)?)/i,
  ];

  for (const pattern of invoicePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      let invNum = match[0].includes("seria") && match[2]
          ? `${match[1]}${match[2]}`
          : match[1];
      // Clean up: remove trailing keywords that got captured (e.g., "12345Date" from pdf-parse concatenation)
      invNum = invNum.replace(/(?:Date|Amount|Total|Sold|Bill|Item|Qty).*$/i, '').trim();
      if (invNum.length >= 3) {
        result.invoice_number = invNum;
        matchCount++;
        break;
      }
      // Too short (e.g., "1" from false match) — try next pattern
    }
  }

  // 2. Partner name (company names with SRL, SA, etc.)
  const companyPatterns = [
    // Romanian keyword-based patterns
    /(?:furnizor|client|cumpar[aă]tor|beneficiar|emitent|prestator|vanzator|v[aâ]nz[aă]tor)[\s:]*([A-Z][A-Za-zĂăÂâÎîȘșȚț\s.,-]+(?:S\.?R\.?L\.?|S\.?A\.?|S\.?C\.?A\.?|P\.?F\.?A\.?|I\.?I\.?|I\.?F\.?N?\.?))/i,
    // English company suffixes (LLC, Ltd, Inc, PBC, etc.)
    /\b([A-Z][A-Za-z\s.,'-]+?(?:LLC|Ltd\.?|Limited|Inc\.?|Incorporated|PBC|Corp\.?|Corporation|GmbH|BV|NV|AG|LP|LLP))\b/,
    // Romanian S.C. prefix
    /\b(S\.?C\.?\s+[A-Z][A-Z\s.]+(?:S\.?R\.?L\.?|S\.?A\.?))\b/,
    // Romanian suffix without prefix
    /\b([A-Z][A-Z\s.]{2,30}(?:S\.?R\.?L\.?|S\.?A\.?|P\.?F\.?A\.?|I\.?F\.?N\.?\s*S\.?A\.?))\b/,
  ];

  for (const pattern of companyPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.partner_name = match[1].trim().replace(/\s+/g, " ");
      matchCount++;
      break;
    }
  }

  // 3. CUI / CIF
  const cuiPatterns = [
    /(?:C\.?U\.?I\.?|C\.?I\.?F\.?|cod\s+fiscal|cod\s+unic)[\s:]*(?:RO)?(\d{2,10})/i,
    /\b(?:RO)(\d{2,10})\b/,
  ];

  for (const pattern of cuiPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.partner_cui = `RO${match[1]}`;
      matchCount++;
      break;
    }
  }

  // 4. Dates
  // Romanian keyword-based date patterns (DD.MM.YYYY)
  const issueDatePatterns = [
    /(?:data\s*(?:facturii|emiterii|emisiunii|emit))[\s:]*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i,
    /(?:dat[aă])[\s:]*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i,
  ];

  for (const pattern of issueDatePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const parts = match[1].match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
      if (parts) {
        result.issue_date = `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        matchCount++;
        break;
      }
    }
  }

  // English keyword-based date patterns: "Date: January 13, 2026" or "Date: 01/13/2026"
  if (!result.issue_date) {
    const MONTH_NAMES: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
      jan: "01", feb: "02", mar: "03", apr: "04",
      jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };

    // "Date: January 13, 2026" or "Invoice Date: Jan 1, 2026"
    // Also handles pdf-parse concatenation: "Date of issueJanuary 7, 2026"
    const englishDatePatterns = [
      /(?:date\s*(?:of\s*)?issue|invoice\s*date|billing\s*date|date\s*due|date)[\s:]*(\w+)\s+(\d{1,2}),?\s*(\d{4})/i,
      /(?:date\s*(?:of\s*)?issue|invoice\s*date|billing\s*date|date)[\s:]*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i,
    ];

    for (const pattern of englishDatePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const monthStr = match[1].toLowerCase();
        if (MONTH_NAMES[monthStr]) {
          // "January 13, 2026" format
          result.issue_date = `${match[3]}-${MONTH_NAMES[monthStr]}-${match[2].padStart(2, "0")}`;
          matchCount++;
          break;
        } else if (/^\d{1,2}$/.test(match[1])) {
          // MM/DD/YYYY format (English invoices use month-first)
          const month = match[1].padStart(2, "0");
          const day = match[2].padStart(2, "0");
          if (parseInt(month) <= 12 && parseInt(day) <= 31) {
            result.issue_date = `${match[3]}-${month}-${day}`;
            matchCount++;
            break;
          }
        }
      }
    }

    // Fallback: "Month DD, YYYY" anywhere in text (not behind a keyword)
    if (!result.issue_date) {
      const monthRegex = new RegExp(
        `\\b(${Object.keys(MONTH_NAMES).join("|")})\\s+(\\d{1,2}),?\\s*(\\d{4})\\b`,
        "i"
      );
      const monthMatch = normalized.match(monthRegex);
      if (monthMatch) {
        const m = MONTH_NAMES[monthMatch[1].toLowerCase()];
        if (m) {
          result.issue_date = `${monthMatch[3]}-${m}-${monthMatch[2].padStart(2, "0")}`;
          matchCount++;
        }
      }
    }
  }

  // Fallback: first DD.MM.YYYY or DD/MM/YYYY date found
  if (!result.issue_date) {
    const dateMatch = normalized.match(
      /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/
    );
    if (
      dateMatch &&
      parseInt(dateMatch[2]) <= 12 &&
      parseInt(dateMatch[1]) <= 31
    ) {
      result.issue_date = `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
      matchCount++;
    }
  }

  // Due date
  const dueDatePatterns = [
    /(?:scaden[tț][aă]|data\s*scaden[tț])[\s:]*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i,
    /(?:termen\s*(?:de\s*)?plat[aă])[\s:]*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i,
  ];

  for (const pattern of dueDatePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const parts = match[1].match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
      if (parts) {
        result.due_date = `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        matchCount++;
        break;
      }
    }
  }

  // 5. Amounts
  // Total amount (Romanian + English patterns)
  const totalPatterns = [
    // Romanian patterns
    /(?:total\s*(?:general|de\s*plat[aă]|factur[aă])?)[\s:]*(\d[\d.,]*\d)\s*(?:RON|LEI|EUR|USD)?/i,
    /(?:de\s*plat[aă]|total)[\s:]*(\d[\d.,]*\d)/i,
    /(?:TOTAL)[\s:]*(\d[\d.,]*\d)/,
    // English patterns (OpenAI, Anthropic, Suno, Microsoft, etc.)
    // Handles: "Amount due€90.00" or "Amount due$20.00 USD" (pdf-parse concatenation)
    /(?:amount\s*due|total\s*(?:amount|due|charged)|balance\s*due)(?:\s*\([A-Z]{3}\))?\s*[$€£]?\s*(\d[\d.,]*\d)/i,
    /(?:charged|payment\s*amount)[\s:]*[$€£]?\s*(\d[\d.,]*\d)/i,
    // "Total Amount (GBP)\n22.99" — Microsoft format with currency code in parens
    /(?:total\s*amount)\s*\([A-Z]{3}\)\s*(\d[\d.,]*\d)/i,
    // Currency symbol before amount: "$20.00", "€90.00"
    /(?:total|amount|charged|due)[\s:]*[$€£]\s*(\d[\d.,]*\d)/i,
    // Subtotal or Total with currency symbol (Stripe format)
    /(?:subtotal|total)[$€£]\s*(\d[\d.,]*\d)/i,
  ];

  for (const pattern of totalPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.total_amount = parseRomanianNumber(match[1]);
      matchCount++;
      break;
    }
  }

  // TVA amount
  const vatPatterns = [
    /(?:TVA|T\.V\.A\.?)[\s:]*(\d[\d.,]*\d)\s*(?:RON|LEI|EUR|USD)?/i,
    /(?:val(?:oare)?\s*TVA)[\s:]*(\d[\d.,]*\d)/i,
  ];

  for (const pattern of vatPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.vat_amount = parseRomanianNumber(match[1]);
      matchCount++;
      break;
    }
  }

  // Base amount
  const basePatterns = [
    /(?:baz[aă]\s*(?:de\s*)?impozitare|total\s*f[aă]r[aă]\s*TVA|valoare\s*f[aă]r[aă]\s*TVA)[\s:]*(\d[\d.,]*\d)/i,
    /(?:subtotal)[\s:]*(\d[\d.,]*\d)/i,
  ];

  for (const pattern of basePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.amount_without_vat = parseRomanianNumber(match[1]);
      matchCount++;
      break;
    }
  }

  // Calculate missing amounts
  if (result.total_amount && result.vat_amount && !result.amount_without_vat) {
    result.amount_without_vat =
      Math.round((result.total_amount - result.vat_amount) * 100) / 100;
  } else if (result.total_amount && !result.vat_amount) {
    result.vat_amount =
      Math.round((result.total_amount - result.total_amount / 1.19) * 100) /
      100;
    result.amount_without_vat =
      Math.round((result.total_amount - result.vat_amount) * 100) / 100;
  } else if (
    result.amount_without_vat &&
    result.vat_amount &&
    !result.total_amount
  ) {
    result.total_amount =
      Math.round((result.amount_without_vat + result.vat_amount) * 100) / 100;
  }

  // 6. Currency
  if (/EUR|€/i.test(normalized)) {
    result.currency = "EUR";
  } else if (/USD|\$(?!\d*\.\d+\.\d)/i.test(normalized)) {
    result.currency = "USD";
  } else if (/GBP|£/i.test(normalized)) {
    result.currency = "GBP";
  } else {
    result.currency = "RON";
  }

  // Fallback: find largest number as total
  if (!result.total_amount) {
    const allNumbers = normalized.match(
      /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\b/g
    );
    if (allNumbers) {
      const parsed = allNumbers
        .map(parseRomanianNumber)
        .filter((n) => n > 0);
      if (parsed.length > 0) {
        result.total_amount = Math.max(...parsed);
        result.vat_amount =
          Math.round(
            (result.total_amount - result.total_amount / 1.19) * 100
          ) / 100;
        result.amount_without_vat =
          Math.round((result.total_amount - result.vat_amount) * 100) / 100;
        matchCount++;
      }
    }
  }

  const confidence = Math.min(matchCount / totalFields, 1);
  return { data: result, confidence };
}

/**
 * Parse a bank statement — supports ING multi-line format
 *
 * ING structure per transaction block:
 *   Line 0: Date (dd.mm.yyyy)
 *   Line 1: Bank reference number (e.g. "1064")
 *   Line 2: COUNTERPARTY NAME  ← this is what we extract
 *   Lines 3+: details (IBAN, bank, description...)
 *   Last meaningful line: amounts concatenated  e.g. "-1,545.85123,683.10"
 *     First number = transaction amount (negative = debit)
 *     Second number = balance after transaction
 *
 * Filters out: CONTRIBUTII, Bugetul de Stat, Service Fee, Comision, Dobanda
 */
function parseBankStatement(text: string): {
  transactions: BankTransactionResult[];
  confidence: number;
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // ING format: date on its own line (dd.mm.yyyy)
  const dateLineRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;

  // Find all transaction block start positions
  const blockStarts: { index: number; date: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(dateLineRegex);
    if (m) {
      blockStarts.push({
        index: i,
        date: `${m[3]}-${m[2]}-${m[1]}`,
      });
    }
  }

  console.log(`[OCR] Found ${blockStarts.length} date blocks in statement`);

  const transactions: BankTransactionResult[] = [];

  // ING amount regex: international format (comma=thousands, dot=decimal)
  // Matches: -1,545.85  or  10,062.20  or  473.81  or  29,558.65
  const ingAmountRegex = /(-?\d{1,3}(?:,\d{3})*\.\d{2})/g;

  for (let b = 0; b < blockStarts.length; b++) {
    const start = blockStarts[b].index;
    const end =
      b + 1 < blockStarts.length ? blockStarts[b + 1].index : lines.length;
    const block = lines.slice(start, end);

    if (block.length < 3) continue;

    const date = blockStarts[b].date;

    // Line 1 = reference number (skip)
    // Line 2 = counterparty name
    const counterparty = block[2];

    // Skip if counterparty looks like a header or footer
    if (!counterparty || /^(Book Date|Bank Reference|Page\s?\d)/i.test(counterparty)) {
      continue;
    }

    // Search from the end of the block for the amount line
    // ING concatenates: txAmount + balanceAfter, e.g. "-1,545.85123,683.10"
    let txAmount = 0;
    let found = false;

    for (let i = block.length - 1; i >= 3 && !found; i--) {
      const matches = [...block[i].matchAll(ingAmountRegex)];
      if (matches.length >= 2) {
        // First match = transaction amount, second = balance after
        txAmount = parseFloat(matches[0][1].replace(/,/g, ""));
        found = true;
      }
    }

    if (!found) continue;

    transactions.push({
      date,
      description: counterparty,
      amount: Math.abs(txAmount),
      type: txAmount < 0 ? "debit" : "credit",
      currency: "RON",
    });
  }

  // Filter out non-invoice transactions (taxes, contributions, bank fees)
  const ignorePatterns = [
    /contributii?\s*asigurat/i,
    /bugetul?\s*(de\s*)?stat/i,
    /service\s*fee/i,
    /comision/i,
    /dobanda/i,
    /impozit\s*(pe\s*)?venit/i,
    /tax\s*on\s*interest/i,
  ];

  const filtered = transactions.filter(
    (t) => !ignorePatterns.some((p) => p.test(t.description))
  );

  console.log(
    `[OCR] Parsed ${transactions.length} total transactions, ${filtered.length} after filtering`
  );

  const confidence =
    filtered.length > 0 ? Math.min(filtered.length / 5, 1) : 0;
  return { transactions: filtered, confidence };
}

/**
 * Process a document from a Buffer — used when file is already downloaded
 */
export async function processDocumentFromBuffer(
  buffer: Buffer,
  fileType: "invoice" | "statement"
): Promise<OCRResult> {
  console.log(`[OCR] Processing ${fileType} from buffer (${buffer.length} bytes)`);

  try {
    const rawText = await extractPDFText(buffer);

    if (!rawText || rawText.trim().length < 10) {
      return {
        success: false,
        data: null,
        confidence: 0,
        raw_text: rawText || "[No text extracted from PDF]",
        file_type: fileType,
      };
    }

    console.log(`[OCR] Extracted ${rawText.length} characters of text`);

    if (fileType === "invoice") {
      const { data, confidence } = parseInvoice(rawText);
      return {
        success: confidence > 0,
        data,
        confidence,
        raw_text: rawText.substring(0, 2000),
        file_type: "invoice",
      };
    }

    // Bank statement
    const { transactions, confidence } = parseBankStatement(rawText);
    return {
      success: transactions.length > 0,
      data: null,
      transactions,
      confidence,
      raw_text: rawText.substring(0, 2000),
      file_type: "statement",
    };
  } catch (error) {
    console.error("[OCR] Processing error:", error);
    return {
      success: false,
      data: null,
      confidence: 0,
      raw_text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      file_type: fileType,
    };
  }
}

/**
 * Process a document — main entry point (downloads from URL)
 */
export async function processDocument(
  fileUrl: string,
  fileType: "invoice" | "statement"
): Promise<OCRResult> {
  console.log(`[OCR] Processing ${fileType} from: ${fileUrl}`);

  try {
    const buffer = await downloadFile(fileUrl);
    const rawText = await extractPDFText(buffer);

    if (!rawText || rawText.trim().length < 10) {
      return {
        success: false,
        data: null,
        confidence: 0,
        raw_text: rawText || "[No text extracted from PDF]",
        file_type: fileType,
      };
    }

    console.log(`[OCR] Extracted ${rawText.length} characters of text`);

    if (fileType === "invoice") {
      const { data, confidence } = parseInvoice(rawText);
      return {
        success: confidence > 0,
        data,
        confidence,
        raw_text: rawText.substring(0, 2000),
        file_type: "invoice",
      };
    }

    // Bank statement
    const { transactions, confidence } = parseBankStatement(rawText);
    return {
      success: transactions.length > 0,
      data: null,
      transactions,
      confidence,
      raw_text: rawText.substring(0, 2000),
      file_type: "statement",
    };
  } catch (error) {
    console.error("[OCR] Processing error:", error);
    return {
      success: false,
      data: null,
      confidence: 0,
      raw_text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      file_type: fileType,
    };
  }
}
