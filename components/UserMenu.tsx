"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function UserMenu() {
  const { data: session, status } = useSession();

  // Loading → avoid flicker
  if (status === "loading") return null;

  // Not logged in → show nav + Sign In button
  if (!session) {
    return (
      <div className="flex items-center gap-6">
        {/* Top navigation */}
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/" className="hover:text-blue-400 transition">
            Home
          </Link>
          <Link href="/demo" className="hover:text-blue-400 transition">
            Demo Page
          </Link>
          <Link href="/dashboard" className="hover:text-blue-400 transition">
            Dashboard
          </Link>
        </nav>

        {/* Sign In */}
        <button
          onClick={() => signIn("google")}
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Logged-in user
  const user = session.user;

  return (
    <div className="flex items-center gap-6">
      {/* Top navigation */}
      <nav className="flex gap-4 text-sm font-medium">
        <Link href="/" className="hover:text-blue-400 transition">
          Home
        </Link>
        <Link href="/demo" className="hover:text-blue-400 transition">
          Demo Page
        </Link>
        <Link href="/dashboard" className="hover:text-blue-400 transition">
          Dashboard
        </Link>
        <Link href="/info" className="hover:text-blue-400 transition">
          Info
        </Link>

      </nav>

      {/* Avatar + Dropdown */}
      <div className="relative group">
        <button className="rounded-full overflow-hidden border border-gray-700">
          <Image
            src={user?.image ?? "/default-avatar.png"}
            alt="User avatar"
            width={40}
            height={40}
            className="cursor-pointer"
          />
        </button>

        <div className="absolute right-0 mt-2 hidden group-hover:block bg-gray-900 text-white rounded-lg shadow-lg p-3 w-48 z-50">
          <div className="mb-2">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-gray-400 break-all">{user?.email}</p>
          </div>

          <button
            onClick={() => signOut()}
            className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
