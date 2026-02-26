import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { processDocument, processDocumentFromBuffer } from "@/lib/ocr/processor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl, fileType, storagePath } = body;

    if (!fileType || (!fileUrl && !storagePath)) {
      return NextResponse.json(
        { error: "fileType and (fileUrl or storagePath) are required" },
        { status: 400 }
      );
    }

    // If storagePath is provided, download from Supabase Storage with service role
    if (storagePath) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data, error } = await supabase.storage
        .from("documents")
        .download(storagePath);

      if (error || !data) {
        console.error("[OCR API] Storage download error:", error);
        return NextResponse.json(
          { error: `Failed to download from storage: ${error?.message}` },
          { status: 500 }
        );
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await processDocumentFromBuffer(buffer, fileType);
      return NextResponse.json(result);
    }

    // Fallback: download from public URL
    const result = await processDocument(fileUrl, fileType);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[OCR API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        data: null,
        confidence: 0,
        raw_text: "",
        file_type: "statement",
      },
      { status: 500 }
    );
  }
}
