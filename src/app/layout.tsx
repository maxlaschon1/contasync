import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ContaSync — Colaborare Contabilitate & Client",
  description:
    "Platformă de colaborare între firme de contabilitate și clienți. Upload documente, OCR automat, calcul taxe, notificări.",
  keywords: [
    "contabilitate",
    "facturi",
    "extrase de cont",
    "taxe",
    "contasync",
    "OCR",
    "România",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="scroll-smooth">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
