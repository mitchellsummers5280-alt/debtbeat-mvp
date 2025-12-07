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
      <div className="relative flex w-full items-center px-4 py-3">
        {/* Left: Logo + Wordmark */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 border border-slate-700">
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

          <span className="text-lg font-semibold tracking-tight">
            Debt<span className="text-emerald-400">Beat</span>
          </span>
        </Link>

        {/* Center Navigation */}
        <nav className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-6 text-xs sm:text-sm font-medium">
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
