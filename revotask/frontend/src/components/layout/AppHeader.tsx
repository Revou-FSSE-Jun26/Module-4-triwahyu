"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { BaseButton } from "@/components/shared/BaseButton";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/", label: "Boards" },
  { href: "/my-tasks", label: "My Tasks" },
  { href: "/profile", label: "Profile" },
];

export function AppHeader() {
  const { token, user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="border-b-3 border-ink bg-paper shadow-hard">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href={token ? "/" : "/login"}
          className="mr-auto text-2xl font-black tracking-tighter"
        >
          RevoTask
        </Link>

        {token ? (
          <>
            <nav
              aria-label="Main"
              className="order-last flex w-full gap-1 sm:order-none sm:w-auto"
            >
              {links.map(({ href, label }) => {
                const active =
                  href === "/"
                    ? pathname === "/" || pathname.startsWith("/boards")
                    : pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center border-b-4 px-3 text-sm font-bold ${
                      active
                        ? "border-signal-500 text-ink"
                        : "border-transparent text-concrete-700 hover:text-ink"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <NotificationBell />
            <span className="hidden max-w-[10rem] truncate font-mono text-xs text-concrete-700 md:inline">
              {user?.name ?? ""}
            </span>
            {/* REQ-AUTH-8: clears AuthContext and the session cookie, then lands on /login */}
            <BaseButton variant="secondary" size="sm" onClick={() => logout()}>
              Log out
            </BaseButton>
          </>
        ) : (
          <nav aria-label="Account" className="flex gap-2">
            <BaseButton href="/login" variant="secondary">
              Sign in
            </BaseButton>
            <BaseButton href="/register">Create account</BaseButton>
          </nav>
        )}
      </div>
    </header>
  );
}
