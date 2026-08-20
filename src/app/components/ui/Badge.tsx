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
    default: "border-zinc-800 bg-zinc-950/60 text-zinc-300",
    success: "border-emerald-900/50 bg-emerald-950/40 text-emerald-200",
    warning: "border-amber-900/50 bg-amber-950/40 text-amber-200",
    error: "border-red-900/50 bg-red-950/40 text-red-200",
    info: "border-sky-900/50 bg-sky-950/40 text-sky-200",
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
        "max-w-full truncate rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[11px] text-zinc-300",
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
