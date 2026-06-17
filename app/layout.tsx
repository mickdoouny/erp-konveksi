import type { Metadata } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientSessionProvider } from "@/components/client-session-provider";
import { SessionBootstrap } from "@/components/session-bootstrap";
import { parsePendingUser, USER_SESSION_COOKIE } from "@/lib/login-session";
import { SESSION_SYNC_INLINE_SCRIPT } from "@/lib/session-sync-script";
import { CRITICAL_SHELL_CSS } from "@/lib/critical-shell-css";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get(USER_SESSION_COOKIE)?.value;
  const initialUser = sessionRaw ? parsePendingUser(sessionRaw) : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#030304] text-zinc-100 antialiased">
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_SHELL_CSS }} />
        <Script
          id="erp-session-sync"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: SESSION_SYNC_INLINE_SCRIPT }}
        />
        <ClientSessionProvider initialUser={initialUser}>
          <SessionBootstrap />
          {children}
        </ClientSessionProvider>
      </body>
    </html>
  );
}
