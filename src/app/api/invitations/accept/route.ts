import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: "Token and userId are required" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS — only the server knows this key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: "Invitatie invalida sau expirata" },
        { status: 400 }
      );
    }

    // Add user to company
    const { error: cuError } = await supabase.from("company_users").insert({
      company_id: invitation.company_id,
      user_id: userId,
      role: invitation.role,
    });

    if (cuError) {
      console.error("[INVITE ACCEPT] company_users insert error:", cuError);
      return NextResponse.json({ error: cuError.message }, { status: 500 });
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("[INVITE ACCEPT] invitation update error:", updateError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[INVITE ACCEPT] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
