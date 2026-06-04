import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionBootstrap } from "@/components/session-bootstrap";
import { SESSION_SYNC_INLINE_SCRIPT } from "@/lib/session-sync-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DPK · ERP Konveksi",
  description: "Production Management System · Dasa Putra Kreatif",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#030304] text-zinc-100 antialiased">
        <Script
          id="erp-session-sync"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: SESSION_SYNC_INLINE_SCRIPT }}
        />
        <SessionBootstrap />
        {children}
      </body>
    </html>
  );
}
