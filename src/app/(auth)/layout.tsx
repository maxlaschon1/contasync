import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
          CS
        </div>
        <span className="text-xl font-bold tracking-tight">ContaSync</span>
      </Link>
      <div className="w-full max-w-[420px]">{children}</div>
    </div>
  );
}
