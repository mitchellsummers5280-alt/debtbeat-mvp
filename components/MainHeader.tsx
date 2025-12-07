"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const navItems = [
  { href: "/", label: "Strategy" },
  { href: "/demo", label: "Your Plan" },
  { href: "/dashboard", label: "Summary" },
  { href: "/info", label: "About" },
];

export function MainHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 bg-black/95">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Logo + Wordmark */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950">
            <Image
              src="/debtbeat-logo.png"
              alt="DebtBeat logo"
              width={40}
              height={40}
              className="object-contain"
              style={{ filter: "invert(1)" }}
              priority
            />
          </div>

          {/* Hide the text on the tiniest screens so it never collides */}
          <span className="hidden text-lg font-semibold tracking-tight xs:inline">
            Debt<span className="text-emerald-400">Beat</span>
          </span>
        </Link>

        {/* Nav: wraps on small screens instead of overlapping */}
        <nav className="flex flex-wrap gap-4 text-xs font-medium text-slate-300 sm:text-sm">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors ${
                  isActive
                    ? "text-emerald-400"
                    : "text-slate-300 hover:text-emerald-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
