"use client";

import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

export default function UserMenu() {
  const { data: session, status } = useSession();

  // Still loading → render nothing (avoids flicker)
  if (status === "loading") return null;

  // Not logged in → simple Sign In button
  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition"
      >
        Sign In
      </button>
    );
  }

  const user = session.user;

  return (
    <div className="relative group">
      {/* Avatar */}
      <button className="rounded-full overflow-hidden border border-gray-700">
        <Image
          src={user?.image ?? "/default-avatar.png"}
          alt="User avatar"
          width={40}
          height={40}
          className="cursor-pointer"
        />
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 hidden group-hover:block bg-gray-900 text-white rounded-lg shadow-lg p-3 w-48 z-50">
        <div className="mb-2">
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>

        <button
          onClick={() => signOut()}
          className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
