"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function UserMenu() {
  const { data: session, status } = useSession();

  // Loading state
  if (status === "loading") return null;

  // Not logged in → show sign-in button
  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="px-4 py-2 rounded-md bg-blue-600 text-white"
      >
        Sign In
      </button>
    );
  }

  // Logged in → show user avatar + dropdown
  const user = session.user;

  return (
    <div className="relative group">
      <img
        src={user?.image ?? "/default-avatar.png"}
        alt="Profile"
        className="w-10 h-10 rounded-full cursor-pointer border"
      />

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 hidden group-hover:block bg-gray-900 text-white rounded-lg shadow-lg p-3 w-48">
        <p className="font-semibold">{user?.name}</p>
        <p className="text-sm text-gray-400 mb-2">{user?.email}</p>

        <button
          onClick={() => signOut()}
          className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
