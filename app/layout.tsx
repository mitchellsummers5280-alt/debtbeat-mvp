// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { MainHeader } from "@/components/MainHeader";

export const metadata: Metadata = {
  title: "DebtBeat",
  description: "DebtBeat – gamified credit card payoff planner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="flex min-h-screen flex-col">
          <MainHeader />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
