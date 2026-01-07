import type { SleeperRoster, SleeperUser } from "./sleeper";

export type Team = {
  rosterId: number;
  ownerId: string | null;
  name: string;
  displayName: string;
  avatar?: string | null;
};

export function buildTeams(users: SleeperUser[], rosters: SleeperRoster[]): Map<number, Team> {
  const userById = new Map<string, SleeperUser>();
  for (const u of users) userById.set(u.user_id, u);

  const teams = new Map<number, Team>();

  for (const r of rosters) {
    const owner = r.owner_id ? userById.get(r.owner_id) : undefined;

    const teamName =
      owner?.metadata?.team_name?.trim() ||
      owner?.display_name?.trim() ||
      `Team ${r.roster_id}`;

    teams.set(r.roster_id, {
      rosterId: r.roster_id,
      ownerId: r.owner_id ?? null,
      name: teamName,
      displayName: owner?.display_name ?? teamName,
      avatar: owner?.avatar ?? null,
    });
  }

  return teams;
}

export function formatPoints(val: number) {
  return (Math.round(val * 10) / 10).toFixed(1);
}
