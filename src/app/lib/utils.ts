/**
 * Shared utility functions used across the application
 */

/**
 * Conditionally join classNames together
 * Alternative to clsx/classnames for simple use cases
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Format a score to one decimal place
 */
export function scoreFmt(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/**
 * Format points (alias for scoreFmt for semantic clarity)
 */
export function formatPoints(n: number): string {
  return scoreFmt(n);
}

/**
 * Generate initials from a name (first + last)
 */
export function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "V";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

/**
 * Convert a Sleeper avatar ID to a thumbnail URL
 */
export function sleeperAvatarThumb(avatar?: string | null): string | null {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/thumbs/${avatar}`;
}

/**
 * Format a date string to a readable format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a timestamp to a relative time (e.g., "2 hours ago")
 */
export function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/**
 * Safely get a string value from any input
 */
export function safeStr(v: any): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/**
 * Calculate win percentage from wins/losses/ties
 */
export function winPercentage(wins: number, losses: number, ties: number = 0): number {
  const games = wins + losses + ties;
  if (games === 0) return 0;
  return (wins + ties * 0.5) / games;
}

/**
 * Format win percentage as a string (e.g., "75.0%")
 */
export function formatWinPct(wins: number, losses: number, ties: number = 0): string {
  return `${(winPercentage(wins, losses, ties) * 100).toFixed(1)}%`;
}
