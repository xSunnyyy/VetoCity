"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type IconKey =
  | "dashboard"
  | "rules"
  | "matchups"
  | "movement"
  | "rosters"
  | "managers"
  | "rivalry"
  | "standings"
  | "drafts"
  | "awards"
  | "records"
  | "report"
  | "more";

type NavItem = { label: string; href: string; icon: IconKey };

// Shown as top-level pills on desktop and as the permanent icon slots on
// mobile — same four items, same order, on both.
const primaryItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Rules", href: "/rules", icon: "rules" },
  { label: "Managers", href: "/league/managers", icon: "managers" },
  { label: "Movement", href: "/movement", icon: "movement" },
];

// Everything else — the desktop "League Info" dropdown and the mobile
// "More" popup both render this same list, in this same order.
const secondaryItems: NavItem[] = [
  { label: "Billy's Report", href: "/league/billys-report", icon: "report" },
  { label: "Rosters", href: "/league/rosters", icon: "rosters" },
  { label: "Matchups", href: "/matchups", icon: "matchups" },
  { label: "Rivalry", href: "/league/rivalry", icon: "rivalry" },
  { label: "Standings", href: "/league/standings", icon: "standings" },
  { label: "Drafts", href: "/league/drafts", icon: "drafts" },
  { label: "Awards", href: "/league/awards", icon: "awards" },
  { label: "Records", href: "/league/records", icon: "records" },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function NavIcon({ icon, className }: { icon: IconKey; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M4 12 12 4l8 8" />
          <path d="M6 10v10h12V10" />
        </svg>
      );
    case "rules":
      return (
        <svg {...common}>
          <path d="M7 3h8l4 4v14H7z" />
          <path d="M15 3v4h4" />
          <path d="M9.5 12h6M9.5 15.5h6M9.5 8.5h3" />
        </svg>
      );
    case "matchups":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "movement":
      return (
        <svg {...common}>
          <path d="M4 17 10 11l4 4 6-8" />
          <path d="M15 7h5v5" />
        </svg>
      );
    case "rosters":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <circle cx="17" cy="7" r="2.4" />
          <path d="M15.5 13.2c2.6.5 4.5 2.6 4.5 5.4" />
        </svg>
      );
    case "managers":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="12" cy="10" r="2.6" />
          <path d="M8 17c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" />
        </svg>
      );
    case "rivalry":
      return (
        <svg {...common}>
          <path d="M12 21s-6.5-4-6.5-9.5A4 4 0 0 1 12 8a4 4 0 0 1 6.5 3.5C18.5 17 12 21 12 21Z" />
        </svg>
      );
    case "standings":
      return (
        <svg {...common}>
          <path d="M5 20V11M12 20V4M19 20v-7" />
        </svg>
      );
    case "drafts":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M7 9h10M7 13h10M7 17h6" />
        </svg>
      );
    case "awards":
      return (
        <svg {...common}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
          <path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4" />
          <path d="M12 13v3m-3 4h6l-1-4h-4l-1 4Z" />
        </svg>
      );
    case "records":
      return (
        <svg {...common}>
          <path d="M7 3h10v18l-5-3-5 3Z" />
        </svg>
      );
    case "report":
      return (
        <svg {...common}>
          <path d="M9 3.5h6a1 1 0 0 1 1 1v.5h-8v-.5a1 1 0 0 1 1-1Z" />
          <rect x="5.5" y="4" width="13" height="17" rx="2" />
          <path d="M8.5 12.5l2.2 2.2L15.5 10" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.2" />
          <rect x="14" y="3" width="7" height="7" rx="1.2" />
          <rect x="3" y="14" width="7" height="7" rx="1.2" />
          <rect x="14" y="14" width="7" height="7" rx="1.2" />
        </svg>
      );
  }
}

export default function FloatingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setMoreOpen(false);
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
    return (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));
  }, [pathname]);

  const moreActive = useMemo(
    () => secondaryItems.some((it) => isActive(it.href)),
    [isActive]
  );

  const pill =
    "h-9 min-w-[120px] inline-flex items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950/70 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-900/70 transition-colors";
  const pillActive = "border-zinc-700 bg-zinc-900/70 text-zinc-100";

  return (
    <>
      {/* Desktop Navigation */}
      <header className="pointer-events-none fixed left-0 right-0 top-4 z-50 hidden md:block">
        <div className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full border border-zinc-800/70 bg-zinc-950/70 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur">
          {primaryItems.map((it) => (
            <Link key={it.href} href={it.href} className={cx(pill, isActive(it.href) && pillActive)}>
              {it.label}
            </Link>
          ))}

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
                  {secondaryItems.map((it) => (
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
      </header>

      {/* Mobile Navigation — icon bar fixed to the bottom, out of the way of page titles */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800/70 bg-zinc-950/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="flex items-stretch justify-between gap-1 px-2 py-1.5">
          {primaryItems.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setMoreOpen(false)}
                className={cx(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-center transition-colors",
                  active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <NavIcon icon={it.icon} className={cx("h-5 w-5", active && "text-red-400")} />
                <span className="text-[10px] font-medium leading-none">{it.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cx(
              "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-center transition-colors",
              moreOpen || moreActive ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <NavIcon icon="more" className={cx("h-5 w-5", (moreOpen || moreActive) && "text-red-400")} />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" popup */}
      {moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-zinc-800 bg-zinc-950 shadow-[0_-16px_50px_rgba(0,0,0,0.6)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            role="dialog"
            aria-label="More navigation"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/70 px-5 py-4">
              <span className="text-sm font-semibold tracking-wide text-zinc-100">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 px-4 py-5">
              {secondaryItems.map((it) => {
                const active = isActive(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setMoreOpen(false)}
                    className={cx(
                      "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors",
                      active ? "bg-zinc-900/60 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                    )}
                  >
                    <NavIcon icon={it.icon} className={cx("h-6 w-6", active && "text-red-400")} />
                    <span className="text-[11px] font-medium leading-none">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
