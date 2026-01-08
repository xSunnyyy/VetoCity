import { NextResponse } from "next/server";

const ROOT_LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// Short cache (great locally + on Vercel)
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

type LeagueInfo = {
  league_id: string;
  season: string;
  previous_league_id: string | null;
  name?: string;
};

async function getLeagueChain(startLeagueId: string, maxSeasons = 10) {
  const chain: LeagueInfo[] = [];
  let cur: string | null = startLeagueId;

  for (let i = 0; i < maxSeasons && cur; i++) {
    const league: LeagueInfo = await j<LeagueInfo>(`${BASE}/league/${cur}`);
    chain.push(league);
    cur = league.previous_league_id ?? null;
  }

  return chain; // newest -> oldest
}

async function determineLastMatchupWeek(leagueId: string): Promise<number> {
  // Try weeks 18..1 and return the latest week with a matchup_id
  for (let w = 18; w >= 1; w--) {
    const m = await j<any[]>(`${BASE}/league/${leagueId}/matchups/${w}`).catch(() => []);
    if (Array.isArray(m) && m.some((x) => typeof x?.matchup_id === "number")) return w;
  }
  return 1;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) return NextResponse.json(cache.data);

    const leagues = await getLeagueChain(ROOT_LEAGUE_ID, 15);

    // Fetch season bundles in parallel (bounded by chain length)
    const seasonBundles = await Promise.all(
      leagues.map(async (lg) => {
        const [users, rosters, lastWeek] = await Promise.all([
          j<any[]>(`${BASE}/league/${lg.league_id}/users`).catch(() => []),
          j<any[]>(`${BASE}/league/${lg.league_id}/rosters`).catch(() => []),
          determineLastMatchupWeek(lg.league_id),
        ]);

        const weeks = Array.from({ length: lastWeek }, (_, i) => i + 1);
        const matchupsByWeek = await Promise.all(
          weeks.map((w) =>
            j<any[]>(`${BASE}/league/${lg.league_id}/matchups/${w}`).catch(() => [])
          )
        );

        return {
          league_id: lg.league_id,
          season: lg.season,
          name: lg.name ?? "",
          lastWeek,
          users,
          rosters,
          weeks: weeks.map((w, i) => ({ week: w, matchups: matchupsByWeek[i] || [] })),
        };
      })
    );

    const data = {
      rootLeagueId: ROOT_LEAGUE_ID,
      seasons: seasonBundles, // newest -> oldest
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: now, data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load all-time rivalry data" },
      { status: 500 }
    );
  }
}
