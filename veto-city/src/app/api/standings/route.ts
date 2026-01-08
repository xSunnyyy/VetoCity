import { NextResponse } from "next/server";

const LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// tiny cache (safe + helpful)
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

// Matchup-based week detection (post-season safe)
async function determineCurrentWeek(): Promise<number> {
  for (let w = 18; w >= 1; w--) {
    const m = await j<any[]>(`${BASE}/league/${LEAGUE_ID}/matchups/${w}`).catch(() => []);
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

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data);
    }

    const [league, users, rosters] = await Promise.all([
      j(`${BASE}/league/${LEAGUE_ID}`),
      j(`${BASE}/league/${LEAGUE_ID}/users`),
      j(`${BASE}/league/${LEAGUE_ID}/rosters`),
    ]);

    const currentWeek = await determineCurrentWeek();

    const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);
    const matchupsByWeek = await Promise.all(
      weeks.map(async (w) => {
        const matchups = await j<any[]>(`${BASE}/league/${LEAGUE_ID}/matchups/${w}`).catch(() => []);
        return { week: w, matchups };
      })
    );

    const data = {
      league,
      users,
      rosters,
      currentWeek,
      matchupsByWeek,
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: now, data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load standings data" },
      { status: 500 }
    );
  }
}
