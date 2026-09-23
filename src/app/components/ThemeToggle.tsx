"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "vetocity-theme";
const DARK_THEME_COLOR = "#18181b";
const LIGHT_THEME_COLOR = "#ffffff";

type Theme = "light" | "dark";

// Tiny external store over `<html>`'s class list, read via
// useSyncExternalStore instead of an effect + setState — the DOM class is
// the single source of truth (already set pre-hydration by the inline
// script in layout.tsx), so this just lets React re-render when our own
// toggle() changes it, with no risk of a hydration mismatch.
let listeners: Array<() => void> = [];

function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function setTheme(next: Theme) {
  document.documentElement.classList.toggle("light", next === "light");

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR);

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore (private browsing, storage disabled, etc.)
  }

  listeners.forEach((l) => l());
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="4" strokeWidth={1.8} />
      <path
        strokeLinecap="round"
        strokeWidth={1.8}
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
      />
    </svg>
  );
}

/** Small fixed top-right control, present on every page via the root
 * layout. Dark is the site's original default and needs no class on
 * <html>; toggling adds/removes `.light`, which the `light:` variant
 * throughout the app keys off of. */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className="fixed right-4 top-4 z-[70] flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/70 light:bg-white/80 text-zinc-200 light:text-zinc-700 shadow-[0_8px_30px_rgba(0,0,0,0.45)] light:shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur transition hover:bg-zinc-900/70 light:hover:bg-zinc-100"
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
