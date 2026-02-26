"use server";

import { createClient } from "@/lib/supabase/server";

export async function uploadFile(
  companyId: string,
  folder: "statements" | "invoices",
  file: File
) {
  const supabase = await createClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const filePath = `${companyId}/${year}/${month}/${folder}/${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (error) return { error: error.message, data: null };

  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(data.path);

  return {
    data: {
      path: data.path,
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
    },
    error: null,
  };
}

export async function getFileUrl(path: string) {
  const supabase = await createClient();

  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 3600); // 1 hour expiry

  return data?.signedUrl || null;
}

export async function deleteFile(path: string) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from("documents").remove([path]);

  if (error) return { error: error.message };
  return { success: true };
}
