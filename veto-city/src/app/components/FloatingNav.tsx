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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileMenuOpen(false);
      }
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

  // Mobile: larger touch targets (h-11 = 44px)
  const pill =
    "h-11 md:h-9 min-w-[120px] inline-flex items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950/70 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-900/70 transition-colors";
  const pillActive = "border-zinc-700 bg-zinc-900/70 text-zinc-100";

  return (
    <>
      <header className="pointer-events-none fixed left-0 right-0 top-4 z-50">
        {/* Desktop Navigation */}
        <div className="pointer-events-auto mx-auto hidden w-fit items-center gap-2 rounded-full border border-zinc-800/70 bg-zinc-950/70 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur md:flex">
          <Link href="/" className={cx(pill, isActive("/") && pillActive)}>
            Dashboard
          </Link>

          <Link
            href="/matchups"
            className={cx(pill, isActive("/matchups") && pillActive)}
          >
            Matchups
          </Link>

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
                        "flex items-center justify-between px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-900/60 transition-colors",
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

        {/* Mobile Hamburger Button */}
        <div className="pointer-events-auto mx-4 flex items-center justify-between rounded-full border border-zinc-800/70 bg-zinc-950/70 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur md:hidden">
          <Link href="/" className="px-2 text-base font-semibold text-zinc-100">
            Veto City
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950/70 text-zinc-200 hover:bg-zinc-900/70 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div
            ref={mobileMenuRef}
            className="absolute right-0 top-0 h-full w-64 overflow-y-auto border-l border-zinc-800 bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <span className="text-lg font-semibold text-zinc-100">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="py-4">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={cx(
                  "flex items-center px-4 py-3 text-base font-medium transition-colors",
                  isActive("/")
                    ? "bg-zinc-900/50 text-zinc-100"
                    : "text-zinc-200 hover:bg-zinc-900/30"
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/matchups"
                onClick={() => setMobileMenuOpen(false)}
                className={cx(
                  "flex items-center px-4 py-3 text-base font-medium transition-colors",
                  isActive("/matchups")
                    ? "bg-zinc-900/50 text-zinc-100"
                    : "text-zinc-200 hover:bg-zinc-900/30"
                )}
              >
                Matchups
              </Link>

              <div className="my-2 h-px bg-zinc-800/70" />
              <div className="px-4 py-2 text-xs font-semibold tracking-wide text-zinc-500">
                League Info
              </div>

              {leagueItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cx(
                    "flex items-center px-4 py-3 text-base font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-zinc-900/50 text-zinc-100"
                      : "text-zinc-200 hover:bg-zinc-900/30"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
