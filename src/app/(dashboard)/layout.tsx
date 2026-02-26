import { Sidebar } from "@/components/contasync/Sidebar";
import { getProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
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
  if (profile?.role === "admin") redirect("/admin");

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar
        variant="client"
        userName={profile?.full_name || user.user_metadata?.full_name || "Client"}
      />
      <main className="flex-1 overflow-y-auto min-h-dvh">{children}</main>
    </div>
  );
}
