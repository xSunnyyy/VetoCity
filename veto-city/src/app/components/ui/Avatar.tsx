import { initials } from "@/app/lib/utils";

export interface AvatarProps {
  /**
   * Team or user name (used for initials fallback)
   */
  name: string;
  /**
   * Avatar URL (optional)
   */
  avatarUrl?: string | null;
  /**
   * Size in pixels (default: 32)
   */
  size?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Team/User Avatar component with initials fallback
 * Shows Sleeper avatar if available, otherwise displays initials
 */
export function Avatar({ name, avatarUrl, size = 32, className = "" }: AvatarProps) {
  const s = `${size}px`;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
      style={{ width: s, height: s }}
      title={name}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-zinc-200">
          {initials(name)}
        </div>
      )}
    </div>
  );
}
