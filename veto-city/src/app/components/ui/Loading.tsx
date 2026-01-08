import { cx } from "@/app/lib/utils";

export interface SkeletonProps {
  /**
   * Width of skeleton (CSS value or className)
   */
  width?: string;
  /**
   * Height of skeleton (CSS value or className)
   */
  height?: string;
  /**
   * Border radius (default: rounded)
   */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Skeleton loading placeholder with shimmer animation
 */
export function Skeleton({ width, height, rounded = "md", className }: SkeletonProps) {
  const roundedClasses = {
    none: "",
    sm: "rounded-sm",
    md: "rounded",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
  };

  return (
    <div
      className={cx(
        "animate-pulse bg-zinc-900/50",
        roundedClasses[rounded],
        className
      )}
      style={{ width, height }}
    />
  );
}

export interface LoadingCardProps {
  /**
   * Number of skeleton cards to show
   */
  count?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Loading skeleton for card grids
 */
export function LoadingCard({ count = 6, className }: LoadingCardProps) {
  return (
    <section className={cx("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
        >
          <div className="flex items-center gap-3">
            <Skeleton width="40px" height="40px" rounded="xl" />
            <Skeleton width="160px" height="16px" />
          </div>
          <div className="mt-5">
            <Skeleton width="100%" height="96px" rounded="xl" />
          </div>
        </div>
      ))}
    </section>
  );
}

export interface LoadingStateProps {
  /**
   * Loading message (default: "Loading...")
   */
  message?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Full-page or section loading state with spinner
 */
export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cx("flex flex-col items-center justify-center gap-4 py-12", className)}>
      <LoadingSpinner />
      <div className="text-sm text-zinc-400">{message}</div>
    </div>
  );
}

/**
 * Animated loading spinner
 */
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400",
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Error state component
 */
export interface ErrorStateProps {
  /**
   * Error title
   */
  title?: string;
  /**
   * Error message
   */
  message: string;
  /**
   * Optional retry callback
   */
  onRetry?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function ErrorState({ title = "Error", message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)]",
        className
      )}
    >
      <div className="text-sm font-semibold text-red-200">{title}</div>
      <div className="mt-2 text-sm text-red-200/90">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-900/40"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
