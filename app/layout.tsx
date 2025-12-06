// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";        // ← ADD THIS LINE
import "./globals.css";

import AuthProvider from "./AuthProvider";
import UserMenu from "@/components/UserMenu";

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-black text-slate-50`}
      >
        <AuthProvider>
          {/* Global app shell */}
          <header className="w-full flex justify-between items-center px-6 py-4 border-b border-neutral-800">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold">DebtBeat</h1>

              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
                <Link href="/" className="hover:text-emerald-300">
                  Home
                </Link>
                <Link href="/demo" className="hover:text-emerald-300">
                  Demo Page
                </Link>
                <Link href="/dashboard" className="hover:text-emerald-300">
                  Dashboard
                </Link>
                <Link href="/info" className="hover:text-emerald-300">
                  Info
                </Link>
              </nav>
            </div>

            <UserMenu />
          </header>


          {/* Each page (/, /demo, /dashboard) controls its own layout */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
