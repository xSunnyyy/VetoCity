import { cx } from "@/app/lib/utils";

export interface DividerProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Horizontal divider line
 */
export function Divider({ className }: DividerProps) {
  return <div className={cx("h-px w-full bg-zinc-800/70", className)} />;
}
