import { Avatar } from "./Avatar";
import { scoreFmt } from "@/app/lib/utils";

export interface TeamRowProps {
  /**
   * Team name
   */
  team: string;
  /**
   * Roster ID
   */
  rosterId: number;
  /**
   * Score to display
   */
  score?: number;
  /**
   * Avatar URL (optional)
   */
  avatarUrl?: string | null;
  /**
   * Avatar size in pixels (default: 28)
   */
  avatarSize?: number;
  /**
   * Additional content to display on the right (replaces score)
   */
  rightContent?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Team Row component - displays team avatar, name, and score
 * Commonly used in matchup cards and standings
 */
export function TeamRow({
  team,
  rosterId,
  score,
  avatarUrl,
  avatarSize = 28,
  rightContent,
  className = "",
}: TeamRowProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={team} avatarUrl={avatarUrl} size={avatarSize} />
        <div className="truncate text-sm font-semibold text-zinc-200">{team}</div>
      </div>
      {rightContent ? (
        rightContent
      ) : score !== undefined ? (
        <div className="text-lg font-semibold text-zinc-100">{scoreFmt(score)}</div>
      ) : null}
    </div>
  );
}
