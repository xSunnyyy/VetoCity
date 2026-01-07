"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type NavItem = { label: string; href: string };

const leagueItems: NavItem[] = [
  { label: "Rosters", href: "/league/rosters" },
  { label: "Rivalry", href: "/league/rivalry" },
  { label: "Standings", href: "/league/standings" },
  { label: "Drafts", href: "/league/drafts" },
  { label: "Awards", href: "/league/awards" },
  { label: "Records", href: "/league/records" },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function FloatingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const isActive = useMemo(() => {
    return (href: string) => pathname === href || pathname?.startsWith(href + "/");
  }, [pathname]);

  // One single pill style for ALL nav buttons (links + dropdown button)
  const pill =
    "h-9 min-w-[120px] inline-flex items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950/70 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-900/70";
  const pillActive = "border-zinc-700 bg-zinc-900/70 text-zinc-100";

  return (
    <header className="pointer-events-none fixed left-0 right-0 top-4 z-50">
      <div className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full border border-zinc-800/70 bg-zinc-950/70 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur">
        {/* Dashboard */}
        <Link href="/" className={cx(pill, isActive("/") && pillActive)}>
          Dashboard
        </Link>

        {/* Matchups */}
        <Link
          href="/matchups"
          className={cx(pill, isActive("/matchups") && pillActive)}
        >
          Matchups
        </Link>

        {/* League Info dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cx(pill, open && pillActive)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="flex items-center gap-2">
              <span>League Info</span>
              <span className="opacity-70">▾</span>
            </span>
          </button>

          {open ? (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
              <div className="px-3 py-2 text-xs font-semibold tracking-wide text-zinc-500">
                League Info
              </div>
              <div className="h-px bg-zinc-800/70" />
              <div className="py-1">
                {leagueItems.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={cx(
                      "flex items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60",
                      isActive(it.href) && "bg-zinc-900/50 text-zinc-100"
                    )}
                  >
                    <span>{it.label}</span>
                    {isActive(it.href) ? (
                      <span className="text-xs text-zinc-500">●</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
