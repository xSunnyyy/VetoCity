import { SLEEPER_BASE as BASE } from "@/app/lib/vetocity";

// Every route that shows all-time history (managers, manager-cards, records,
// standings, rivalry, awards, draftboard) needs the full chain of seasons —
// walking Sleeper's `previous_league_id` links back from the current league.
// That chain can't be parallelized (you don't know league N-1's id until
// you've fetched league N), but it also almost never changes: a past
// season's previous_league_id is permanent, and even the current season's
// only changes once, at rollover. Each route used to walk it from scratch
// with its own copy-pasted loop and its own (often missing, or 60s-only)
// cache, so a single page load could re-walk the same 5-10 seasons of
// history several times over. This shared, longer-lived cache means only
// the first request after it expires pays for the walk — everyone else,
// across every route, reuses the same result. Callers get the *full*
// league object per season, so they should not re-fetch `/league/{id}`
// for ids that appear here.

const CHAIN_TTL_MS = 5 * 60 * 1000;
const chainCache = new Map<string, { ts: number; data: any[] }>();

async function fetchLeague(leagueId: string): Promise<any> {
  const res = await fetch(`${BASE}/league/${leagueId}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for league ${leagueId}`);
  return res.json();
}

/**
 * Full league objects for a season chain, newest season first.
 */
export async function getLeagueChainNewestFirst(
  startLeagueId: string,
  maxSeasons = 30
): Promise<any[]> {
  const now = Date.now();
  const cached = chainCache.get(startLeagueId);
  if (cached && now - cached.ts < CHAIN_TTL_MS) return cached.data;

  const chain: any[] = [];
  const seen = new Set<string>();

  let cur: string | null = startLeagueId;
  for (let i = 0; i < maxSeasons && cur && !seen.has(cur); i++) {
    seen.add(cur);
    const league = await fetchLeague(cur);
    chain.push(league);
    const prev = league?.previous_league_id ? String(league.previous_league_id) : "";
    cur = prev || null;
  }

  chainCache.set(startLeagueId, { ts: now, data: chain });
  return chain;
}

/**
 * Same chain, oldest season first — convenient for callers that accumulate
 * stats chronologically (e.g. win streaks).
 */
export async function getLeagueChainOldestFirst(
  startLeagueId: string,
  maxSeasons = 30
): Promise<any[]> {
  const chain = await getLeagueChainNewestFirst(startLeagueId, maxSeasons);
  return chain.slice().reverse();
}
