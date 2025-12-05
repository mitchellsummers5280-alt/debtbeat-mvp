// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
            <h1 className="text-2xl font-bold">DebtBeat</h1>
            <UserMenu />
          </header>

          <main className="pt-4 px-4">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
