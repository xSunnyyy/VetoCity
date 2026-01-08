import { cx } from "@/app/lib/utils";

export interface CardProps {
  /**
   * Card content
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to add hover effect (default: true)
   */
  hover?: boolean;
}

/**
 * Base Card component with consistent styling
 */
export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur",
        hover && "group",
        className
      )}
    >
      {hover && (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 via-transparent to-transparent" />
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

export interface CardHeaderProps {
  /**
   * Card title
   */
  title: string;
  /**
   * Optional subtitle
   */
  subtitle?: string;
  /**
   * Optional icon element
   */
  icon?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Card Header component with optional icon
 */
export function CardHeader({ title, subtitle, icon, className }: CardHeaderProps) {
  return (
    <div className={cx("flex items-start gap-3 px-5 pt-5", className)}>
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>}
      </div>
    </div>
  );
}

export interface CardContentProps {
  /**
   * Content to display
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Card Content wrapper with consistent padding
 */
export function CardContent({ children, className }: CardContentProps) {
  return <div className={cx("px-5 pb-5 pt-4", className)}>{children}</div>;
}

/**
 * Inner card box (used for nested content within cards)
 */
export function CardBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}
