"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navBtn =
  "rounded-none border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900";

const navBtnActive =
  "rounded-none border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100";

export default function FloatingNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const linkClass = (href: string) => (isActive(href) ? navBtnActive : navBtn);

  const leagueItems: Array<{ label: string; href: string }> = [
    { label: "Rosters", href: "/league/rosters" },
    { label: "Rivalry", href: "/league/rivalry" },
    { label: "Standings", href: "/league/standings" },
    { label: "Drafts", href: "/league/drafts" },
    { label: "Awards", href: "/league/awards" },
    { label: "Records", href: "/league/records" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">
          Veto City
        </div>

        <nav className="flex items-center gap-2">
          <Link className={linkClass("/")} href="/">
            Dashboard
          </Link>

          <Link className={linkClass("/matchups")} href="/matchups">
            Matchups
          </Link>

          <details className="relative">
            <summary className={navBtn + " cursor-pointer list-none"}>
              League Info
            </summary>

            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-none border border-zinc-800 bg-zinc-950 shadow-lg">
              {leagueItems.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  {it.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
