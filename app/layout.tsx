// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AuthProvider from "./AuthProvider";
import { DebtProvider } from "@/lib/debtStore";
import { MainHeader } from "@/components/MainHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DebtBeat",
  description: "A debt payoff planner that helps you become debt-free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">

        <AuthProvider>
          <DebtProvider>
            <MainHeader />
            <main className="min-h-screen">{children}</main>
          </DebtProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
