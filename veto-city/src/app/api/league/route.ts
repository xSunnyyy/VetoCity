import { NextResponse } from "next/server";

const LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// Cache per requested week (transactions are season-wide, but this keeps it simple)
const cacheByKey = new Map<string, { ts: number; data: any }>();
const TTL_MS = 60 * 1000;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Find the latest week that has *any* transactions.
 * (This is what you originally used to decide how many weeks to pull.)
 */
async function determineTxnWeek(maxWeek: number): Promise<number> {
  for (let w = maxWeek; w >= 1; w--) {
    const tx = await j<any[]>(`${BASE}/league/${LEAGUE_ID}/transactions/${w}`).catch(() => []);
    if (Array.isArray(tx) && tx.length > 0) return w;
  }
  return 1;
}

function inferMaxWeekFromLeague(league: any) {
  const s = league?.settings || {};
  const leg = Number(s.leg ?? 0) || 0; // regular season length (often 14)
  // If leg exists, we still want to allow browsing up to 18 for fantasy UI convenience
  // (you can change this to leg if you want strictly regular season)
  return Math.max(18, leg || 0);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedWeekRaw = Number(url.searchParams.get("week") || "");
    const requestedWeek = Number.isFinite(requestedWeekRaw) ? requestedWeekRaw : null;

    const [league, users, rosters] = await Promise.all([
      j(`${BASE}/league/${LEAGUE_ID}`),
      j(`${BASE}/league/${LEAGUE_ID}/users`),
      j(`${BASE}/league/${LEAGUE_ID}/rosters`),
    ]);

    const maxWeek = inferMaxWeekFromLeague(league);

    // Week to serve for matchups
    const week =
      requestedWeek == null ? 1 : clamp(requestedWeek, 1, maxWeek);

    const cacheKey = `week:${week}`;
    const now = Date.now();

    const cached = cacheByKey.get(cacheKey);
    if (cached && now - cached.ts < TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // ✅ Weekly matchups (drives Matchup of Week / Blowout / Lucky)
    const matchups = await j<any[]>(`${BASE}/league/${LEAGUE_ID}/matchups/${week}`).catch(() => []);

    // ✅ Season-to-date transactions (drives Waivers + Trades cards)
    // Pull weeks 1..txnWeek and flatten (same as your original working route)
    const txnWeek = await determineTxnWeek(maxWeek);
    const weeks = Array.from({ length: txnWeek }, (_, i) => i + 1);

    const txnsByWeek = await Promise.all(
      weeks.map((w) => j<any[]>(`${BASE}/league/${LEAGUE_ID}/transactions/${w}`).catch(() => []))
    );
    const transactions = txnsByWeek.flat();

    const data = {
      league,
      users,
      rosters,

      // Week context
      currentWeek: week,
      maxWeek,
      txnWeek,

      // Data
      matchups,
      transactions,

      fetchedAt: new Date().toISOString(),
    };

    cacheByKey.set(cacheKey, { ts: now, data });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load Sleeper data" },
      { status: 500 }
    );
  }
}
