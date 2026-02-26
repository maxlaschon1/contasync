/**
 * ContaSync — OCR Processor (Stub)
 * Prepared for Google Document AI integration
 */

export interface OCRResult {
  success: boolean;
  data: {
    invoice_number?: string;
    partner_name?: string;
    partner_cui?: string;
    issue_date?: string;
    due_date?: string;
    amount_without_vat?: number;
    vat_amount?: number;
    total_amount?: number;
    currency?: string;
  } | null;
  confidence: number;
  raw_text?: string;
}

/**
 * Process a document image/PDF through OCR
 * STUB: Returns mock data. Replace with Google Document AI when ready.
 *
 * @param fileUrl - URL of the uploaded document
 * @param fileType - Type: "invoice" | "statement"
 */
export async function processDocument(
  fileUrl: string,
  fileType: "invoice" | "statement"
): Promise<OCRResult> {
  console.log(`[OCR STUB] Processing ${fileType} from: ${fileUrl}`);

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (fileType === "invoice") {
    return {
      success: true,
      data: {
        invoice_number: `STUB-${Date.now().toString().slice(-6)}`,
        partner_name: "Firma OCR Test SRL",
        partner_cui: "RO00000000",
        issue_date: new Date().toISOString().split("T")[0],
        amount_without_vat: 1000,
        vat_amount: 190,
        total_amount: 1190,
        currency: "RON",
      },
      confidence: 0.0, // 0% confidence = stub data
      raw_text: "[OCR STUB] No real OCR processing performed",
    };
  }

  // Bank statement
  return {
    success: true,
    data: null,
    confidence: 0.0,
    raw_text: "[OCR STUB] Bank statement processing not implemented",
  };
}

/**
 * Future: Google Document AI integration
 *
 * import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
 *
 * const client = new DocumentProcessorServiceClient();
 * const processorName = `projects/${projectId}/locations/${location}/processors/${processorId}`;
 *
 * const [result] = await client.processDocument({
 *   name: processorName,
 *   rawDocument: { content: fileBuffer.toString('base64'), mimeType: 'application/pdf' }
 * });
 */
