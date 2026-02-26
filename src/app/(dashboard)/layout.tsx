import { Sidebar } from "@/components/contasync/Sidebar";
import { getProfile } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar variant="client" userName={profile.full_name || "Client"} />
      <main className="flex-1 overflow-y-auto min-h-dvh">{children}</main>
    </div>
  );
}
