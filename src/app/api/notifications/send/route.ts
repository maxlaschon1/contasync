import { NextRequest, NextResponse } from "next/server";
import { sendMissingDocsAlert } from "@/lib/email/sender";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, companyName, missingDocs } = body;

    if (!email || !companyName) {
      return NextResponse.json(
        { error: "email and companyName are required" },
        { status: 400 }
      );
    }

    const result = await sendMissingDocsAlert(
      email,
      companyName,
      missingDocs || ["Extras de cont"]
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Notification API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
