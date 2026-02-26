"use server";

import { createClient } from "@/lib/supabase/server";

export async function getNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("notifications")
    .select("*, companies:company_id(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { error: error.message, data: [] };
  return { data: data || [], error: null };
}

export async function getUnreadCount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count || 0;
}

export async function markAsRead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { error: error.message };
  return { success: true };
}

export async function createNotification(data: {
  userId: string;
  companyId?: string;
  type: "missing_docs" | "period_complete" | "tax_due" | "invitation" | "general";
  title: string;
  message?: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: data.userId,
    company_id: data.companyId || null,
    type: data.type,
    title: data.title,
    message: data.message || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
