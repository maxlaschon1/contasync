import { NextRequest, NextResponse } from "next/server";
import { processDocument } from "@/lib/ocr/processor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl, fileType } = body;

    if (!fileUrl || !fileType) {
      return NextResponse.json(
        { error: "fileUrl and fileType are required" },
        { status: 400 }
      );
    }

    const result = await processDocument(fileUrl, fileType);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[OCR API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
