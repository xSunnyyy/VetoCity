import { NextResponse } from "next/server";
import { LEAGUE_ID as ROOT_LEAGUE_ID, SLEEPER_BASE as BASE } from "@/app/lib/vetocity";
import { getLeagueChainNewestFirst } from "@/app/lib/leagueChain";

// Short cache (great locally + on Vercel)
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

const WEEK_MAX = 18;
const weekNumbers = Array.from({ length: WEEK_MAX }, (_, i) => i + 1);

function lastMatchupWeek(matchupsByWeek: any[][]): number {
  for (let w = matchupsByWeek.length; w >= 1; w--) {
    const m = matchupsByWeek[w - 1];
    if (Array.isArray(m) && m.some((x) => typeof x?.matchup_id === "number")) return w;
  }
  return 1;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) return NextResponse.json(cache.data);

    const leagues = await getLeagueChainNewestFirst(ROOT_LEAGUE_ID, 15);

    // Fetch season bundles in parallel (bounded by chain length). Within
    // each season, every week's matchups are fetched in one parallel batch
    // instead of scanning backward from week 18 one request at a time to
    // find the last scored week and then re-fetching weeks 1..lastWeek.
    const seasonBundles = await Promise.all(
      leagues.map(async (lg) => {
        const [users, rosters, allWeeksMatchups] = await Promise.all([
          j<any[]>(`${BASE}/league/${lg.league_id}/users`).catch(() => []),
          j<any[]>(`${BASE}/league/${lg.league_id}/rosters`).catch(() => []),
          Promise.all(
            weekNumbers.map((w) => j<any[]>(`${BASE}/league/${lg.league_id}/matchups/${w}`).catch(() => []))
          ),
        ]);

        const lastWeek = lastMatchupWeek(allWeeksMatchups);

        return {
          league_id: lg.league_id,
          season: lg.season,
          name: lg.name ?? "",
          lastWeek,
          users,
          rosters,
          weeks: allWeeksMatchups.slice(0, lastWeek).map((matchups, i) => ({ week: i + 1, matchups })),
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
