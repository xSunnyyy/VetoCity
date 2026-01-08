import type { SleeperRoster, SleeperUser } from "./sleeper";

export type Team = {
  rosterId: number;
  ownerId: string | null;

  // Team/Display
  name: string;
  displayName: string;

  // Owner info (what your Rosters page expects)
  ownerName: string;
  ownerAvatar: string | null;

  // Kept for backwards compatibility (some pages may still use team.avatar)
  avatar?: string | null;
};

export function buildTeams(
  users: SleeperUser[],
  rosters: SleeperRoster[]
): Map<number, Team> {
  const userById = new Map<string, SleeperUser>();
  for (const u of users) userById.set(u.user_id, u);

  const teams = new Map<number, Team>();

  for (const r of rosters) {
    const ownerId = r.owner_id ?? null;
    const owner = ownerId ? userById.get(ownerId) : undefined;

    const ownerDisplay =
      owner?.display_name?.trim() ||
      owner?.username?.trim() ||
      "";

    const teamName =
      owner?.metadata?.team_name?.trim() ||
      ownerDisplay ||
      `Team ${r.roster_id}`;

    const ownerAvatar = owner?.avatar ?? null;

    teams.set(r.roster_id, {
      rosterId: r.roster_id,
      ownerId,

      name: teamName,
      displayName: ownerDisplay || teamName,

      ownerName: ownerDisplay,
      ownerAvatar,

      // keep existing field so other pages don't break
      avatar: ownerAvatar,
    });
  }

  return teams;
}

export function formatPoints(val: number) {
  return (Math.round(val * 10) / 10).toFixed(1);
}