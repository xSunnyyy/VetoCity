import { NextResponse } from "next/server";
import { LEAGUE_ID, SLEEPER_BASE as BASE } from "@/app/lib/vetocity";

// Two small caches: the season chain (rarely changes) and per-season
// standings data (recomputed more often since the live season updates).
let seasonsCache: { ts: number; data: SeasonRef[] } | null = null;
const SEASONS_TTL_MS = 5 * 60 * 1000;

const dataCacheByLeagueId = new Map<string, { ts: number; data: any }>();
const DATA_TTL_MS = 60 * 1000;

type SeasonRef = { leagueId: string; season: string };

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function getSeasonChain(startLeagueId: string): Promise<SeasonRef[]> {
  const now = Date.now();
  if (seasonsCache && now - seasonsCache.ts < SEASONS_TTL_MS) return seasonsCache.data;

  const chain: SeasonRef[] = [];
  const seen = new Set<string>();

  let cur: string | null = startLeagueId;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const league: any = await j<any>(`${BASE}/league/${cur}`);
    chain.push({ leagueId: cur, season: String(league?.season ?? "") });
    const prev = league?.previous_league_id ? String(league.previous_league_id) : "";
    cur = prev || null;
  }

  seasonsCache = { ts: now, data: chain };
  return chain;
}

const WEEK_MAX = 18;
const weekNumbers = Array.from({ length: WEEK_MAX }, (_, i) => i + 1);

// Matchup-based week detection (post-season safe) — the last week with any
// scored matchups. For a completed season this lands on its final week.
// Fetches every week in parallel instead of scanning backward one request
// at a time, so the caller can reuse the same results instead of
// re-fetching weeks 1..currentWeek afterward.
async function fetchAllWeeksMatchups(leagueId: string): Promise<any[][]> {
  return Promise.all(
    weekNumbers.map((w) => j<any[]>(`${BASE}/league/${leagueId}/matchups/${w}`).catch(() => []))
  );
}

function lastScoredWeek(matchupsByWeek: any[][]): number {
  for (let w = matchupsByWeek.length; w >= 1; w--) {
    const m = matchupsByWeek[w - 1];
    const ok =
      Array.isArray(m) &&
      m.some(
        (x) =>
          typeof x?.matchup_id === "number" &&
          typeof x?.points === "number" &&
          x.points > 0
      );
    if (ok) return w;
  }
  return 1;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedLeagueId = url.searchParams.get("leagueId");

    const seasons = await getSeasonChain(LEAGUE_ID);
    const targetLeagueId =
      requestedLeagueId && seasons.some((s) => s.leagueId === requestedLeagueId)
        ? requestedLeagueId
        : LEAGUE_ID;

    const now = Date.now();
    const cached = dataCacheByLeagueId.get(targetLeagueId);
    if (cached && now - cached.ts < DATA_TTL_MS) {
      return NextResponse.json({ ...cached.data, seasons, selectedLeagueId: targetLeagueId });
    }

    const [league, users, rosters] = await Promise.all([
      j(`${BASE}/league/${targetLeagueId}`),
      j(`${BASE}/league/${targetLeagueId}/users`),
      j(`${BASE}/league/${targetLeagueId}/rosters`),
    ]);

    const allWeeksMatchups = await fetchAllWeeksMatchups(targetLeagueId);
    const currentWeek = lastScoredWeek(allWeeksMatchups);

    const matchupsByWeek = allWeeksMatchups
      .slice(0, currentWeek)
      .map((matchups, i) => ({ week: i + 1, matchups }));

    const data = {
      league,
      users,
      rosters,
      currentWeek,
      matchupsByWeek,
      fetchedAt: new Date().toISOString(),
    };

    dataCacheByLeagueId.set(targetLeagueId, { ts: now, data });
    return NextResponse.json({ ...data, seasons, selectedLeagueId: targetLeagueId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load standings data" },
      { status: 500 }
    );
  }
}
