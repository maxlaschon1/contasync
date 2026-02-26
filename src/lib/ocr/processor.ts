/**
 * ContaSync — OCR/AI Document Processor
 * Extracts structured data from Romanian invoices and bank statements
 * Uses pdf-parse for PDF text extraction + intelligent pattern matching
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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
    /(?:invoice\s*(?:no\.?|number\.?)\s*)(\S+)/i,
  ];

  for (const pattern of invoicePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.invoice_number =
        match[0].includes("seria") && match[2]
          ? `${match[1]}${match[2]}`
          : match[1];
      matchCount++;
      break;
    }
  }

  // 2. Partner name (company names with SRL, SA, etc.)
  const companyPatterns = [
    /(?:furnizor|client|cumpar[aă]tor|beneficiar|emitent|prestator)[\s:]*([A-Z][A-Za-zĂăÂâÎîȘșȚț\s.,-]+(?:S\.?R\.?L\.?|S\.?A\.?|S\.?C\.?A\.?|P\.?F\.?A\.?|I\.?I\.?|I\.?F\.?))/i,
    /\b(S\.?C\.?\s+[A-Z][A-Z\s.]+(?:S\.?R\.?L\.?|S\.?A\.?))\b/,
    /\b([A-Z][A-Z\s.]{2,30}(?:S\.?R\.?L\.?|S\.?A\.?|P\.?F\.?A\.?))\b/,
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

  // Fallback: first date found
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
  // Total amount
  const totalPatterns = [
    /(?:total\s*(?:general|de\s*plat[aă]|factur[aă])?)[\s:]*(\d[\d.,]*\d)\s*(?:RON|LEI|EUR|USD)?/i,
    /(?:de\s*plat[aă]|total)[\s:]*(\d[\d.,]*\d)/i,
    /(?:TOTAL)[\s:]*(\d[\d.,]*\d)/,
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
  if (/EUR/i.test(normalized)) {
    result.currency = "EUR";
  } else if (/USD|\$/i.test(normalized)) {
    result.currency = "USD";
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
 * Parse a Romanian bank statement from extracted text
 */
function parseBankStatement(text: string): {
  transactions: BankTransactionResult[];
  confidence: number;
} {
  const transactions: BankTransactionResult[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Pattern: date + description + amount
  const transactionPattern =
    /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+?)\s+([-+]?\d[\d.,]*\d)\s*(RON|EUR|USD|LEI)?/i;

  for (const line of lines) {
    const match = line.match(transactionPattern);
    if (match) {
      const dateParts = match[1].match(
        /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/
      );
      if (!dateParts) continue;

      let year = dateParts[3];
      if (year.length === 2) year = `20${year}`;

      const date = `${year}-${dateParts[2].padStart(2, "0")}-${dateParts[1].padStart(2, "0")}`;
      const description = match[2].trim();
      const rawAmount = parseRomanianNumber(match[3]);
      const currency = match[4]?.toUpperCase() || "RON";

      if (rawAmount !== 0) {
        transactions.push({
          date,
          description,
          amount: Math.abs(rawAmount),
          type:
            rawAmount < 0 || match[3].startsWith("-") ? "debit" : "credit",
          currency: currency === "LEI" ? "RON" : currency,
        });
      }
    }
  }

  // Fallback: table pattern (date | desc | debit | credit)
  if (transactions.length === 0) {
    const tablePattern =
      /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+?)\s+(\d[\d.,]*\d)?\s+(\d[\d.,]*\d)?$/;

    for (const line of lines) {
      const match = line.match(tablePattern);
      if (match && (match[3] || match[4])) {
        const dateParts = match[1].match(
          /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/
        );
        if (!dateParts) continue;

        let year = dateParts[3];
        if (year.length === 2) year = `20${year}`;

        const date = `${year}-${dateParts[2].padStart(2, "0")}-${dateParts[1].padStart(2, "0")}`;
        const description = match[2].trim();

        if (match[3]) {
          transactions.push({
            date,
            description,
            amount: parseRomanianNumber(match[3]),
            type: "debit",
            currency: "RON",
          });
        }
        if (match[4]) {
          transactions.push({
            date,
            description,
            amount: parseRomanianNumber(match[4]),
            type: "credit",
            currency: "RON",
          });
        }
      }
    }
  }

  const confidence =
    transactions.length > 0 ? Math.min(transactions.length / 5, 1) : 0;
  return { transactions, confidence };
}

/**
 * Process a document — main entry point
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
