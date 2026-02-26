"use server";

import { createClient } from "@/lib/supabase/server";

export async function createInvitation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const companyId = formData.get("company_id") as string;
  const email = formData.get("email") as string;
  const role = (formData.get("role") as string) || "viewer";

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      company_id: companyId,
      email,
      role,
      invited_by: user?.id,
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  // Build full invite URL
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const inviteUrl = `${baseUrl}/invite/${data.token}`;

  // TODO: Send invitation email via Resend
  console.log(`[EMAIL STUB] Invitation sent to ${email}`);
  console.log(`[EMAIL STUB] Invite link: ${inviteUrl}`);

  return { data, error: null };
}

export async function validateInvitation(token: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invitations")
    .select("*, companies:company_id(name, cui)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error) return { error: "Invitație invalidă sau expirată", data: null };
  return { data, error: null };
}

export async function acceptInvitation(token: string, userId: string) {
  const supabase = await createClient();

  // Get invitation
  const { data: invitation, error: invError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (invError || !invitation) {
    return { error: "Invitație invalidă" };
  }

  // Add user to company
  const { error: cuError } = await supabase.from("company_users").insert({
    company_id: invitation.company_id,
    user_id: userId,
    role: invitation.role,
  });

  if (cuError) return { error: cuError.message };

  // Mark invitation as accepted
  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return { success: true };
}
