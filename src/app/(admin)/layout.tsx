import { Sidebar } from "@/components/contasync/Sidebar";
import { getProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check auth directly — never rely solely on getProfile for auth decisions
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar variant="admin" userName={profile.full_name || "Admin"} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
