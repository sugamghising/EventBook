"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

/**
 * Text wordmark, nav links (role-dependent) and the auth area.
 * On mobile it wraps into two rows: wordmark + auth, then the links.
 */
export function Header() {
  const { user, status, logout } = useAuth();

  const auth =
    status === "loading" ? (
      <div aria-hidden="true" className="h-11 w-44" />
    ) : user ? (
      <div className="flex items-center gap-3">
        <span className="text-muted">{user.name}</span>
        <button onClick={logout} className="min-h-11 rounded-lg px-2 font-medium hover:text-signal">
          Log out
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-3">
        <Link href="/login" className="flex min-h-11 items-center font-medium hover:text-signal">
          Log in
        </Link>
        <Link
          href="/register"
          className="flex min-h-11 items-center rounded-lg bg-signal px-4 font-medium text-surface hover:opacity-90"
        >
          Register
        </Link>
      </div>
    );

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 md:py-3">
        <Link href="/" className="font-heading text-[24px] font-bold">
          EventBook
        </Link>
        <nav aria-label="Main" className="order-last flex w-full items-center gap-5 pb-2 md:order-none md:w-auto md:pb-0">
          <Link href="/" className="font-medium hover:text-signal">
            Events
          </Link>
          {user && (
            <Link href="/bookings" className="font-medium hover:text-signal">
              My bookings
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className="font-medium hover:text-signal">
              Admin
            </Link>
          )}
        </nav>
        {auth}
      </div>
    </header>
  );
}
