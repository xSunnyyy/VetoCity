import { cx } from "@/app/lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  /**
   * Variant styling (default: default)
   */
  variant?: "default" | "success" | "warning" | "error" | "info";
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Pill/Badge component for status indicators and labels
 */
export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantClasses = {
    default: "border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 text-zinc-300 light:text-zinc-700",
    success: "border-emerald-900/50 light:border-emerald-300 bg-emerald-950/40 light:bg-emerald-100 text-emerald-200 light:text-emerald-800",
    warning: "border-amber-900/50 light:border-amber-300 bg-amber-950/40 light:bg-amber-100 text-amber-200 light:text-amber-800",
    error: "border-red-900/50 light:border-red-300 bg-red-950/40 light:bg-red-100 text-red-200 light:text-red-800",
    info: "border-sky-900/50 light:border-sky-300 bg-sky-950/40 light:bg-sky-100 text-sky-200 light:text-sky-800",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export interface ChipProps {
  /**
   * Text to display
   */
  text: string;
  /**
   * Title/tooltip for chip
   */
  title?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Chip component for tag lists (similar to Badge but with truncation)
 */
export function Chip({ text, title, className }: ChipProps) {
  return (
    <span
      className={cx(
        "max-w-full truncate rounded-full border border-zinc-800 light:border-zinc-200 bg-zinc-950/70 light:bg-white/80 px-2 py-0.5 text-[11px] text-zinc-300 light:text-zinc-700",
        className
      )}
      title={title || text}
    >
      {text}
    </span>
  );
}

export interface ChipsProps {
  /**
   * List of items to display as chips
   */
  items: string[];
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Container for displaying multiple chips
 */
export function Chips({ items, className }: ChipsProps) {
  if (!items.length) return null;

  return (
    <div className={cx("mt-2 flex flex-wrap gap-1.5", className)}>
      {items.map((item, i) => (
        <Chip key={`${item}-${i}`} text={item} />
      ))}
    </div>
  );
}
