"use client";

import { signOut } from "next-auth/react";
import type { MouseEvent } from "react";

export default function Logout() {
  const handleLogout = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    // void signOut({ callbackUrl: "/login" });
    void signOut({
      callbackUrl: `${window.location.origin}/login`
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      Logout
    </button>
  );
}
