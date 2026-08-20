import { SLEEPER_BASE } from "./vetocity";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE}${path}`, {
    ...init,
    // Cache hints: browsers may still revalidate; this is fine for a dashboard
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sleeper API error ${res.status} for ${path}: ${text}`);
  }
  return (await res.json()) as T;
}

export type SleeperStateNFL = {
  week: number;
  season: string;
  season_type: "regular" | "post" | string;
};

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  settings?: Record<string, any>;
};

export type SleeperUser = {
  user_id: string;
  display_name: string;
  username?: string; // ✅ add this
  avatar?: string | null;
  metadata?: {
    team_name?: string;
    [k: string]: any;
  };
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  co_owners?: string[] | null;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    [k: string]: any;
  };
  players?: string[] | null;
  starters?: string[] | null;
};

export type SleeperMatchup = {
  roster_id: number;
  matchup_id: number;
  points: number;
  starters?: string[];
  players?: string[];
};

export type SleeperTransaction = {
  transaction_id: string;
  type: "trade" | "waiver" | "free_agent" | "commissioner" | string;
  status: string;
  adds?: Record<string, number>;
  drops?: Record<string, number>;
  roster_ids?: number[];
  consenter_ids?: number[];
  creator?: string;
};

export const sleeper = {
  stateNFL: () => fetchJson<SleeperStateNFL>(`/state/nfl`),
  league: (leagueId: string) => fetchJson<SleeperLeague>(`/league/${leagueId}`),
  users: (leagueId: string) =>
    fetchJson<SleeperUser[]>(`/league/${leagueId}/users`),
  rosters: (leagueId: string) =>
    fetchJson<SleeperRoster[]>(`/league/${leagueId}/rosters`),
  matchups: (leagueId: string, week: number) =>
    fetchJson<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`),
  transactions: (leagueId: string, week: number) =>
    fetchJson<SleeperTransaction[]>(`/league/${leagueId}/transactions/${week}`),
};
