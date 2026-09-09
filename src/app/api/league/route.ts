import { NextResponse } from "next/server";
import { LEAGUE_ID, SLEEPER_BASE as BASE } from "@/app/lib/vetocity";

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

    // ✅ Weekly matchups (drives Matchup of Week / Blowout / Lucky) and
    // season-to-date transactions (drives Waivers + Trades cards), fetched
    // together in one parallel batch. Previously this walked backward from
    // maxWeek to find the latest week with transactions one request at a
    // time (up to 18 serial round-trips) before even starting the real
    // transaction fetch — now every week is requested at once.
    const weekNumbers = Array.from({ length: maxWeek }, (_, i) => i + 1);

    const [matchups, txnsByWeek] = await Promise.all([
      j<any[]>(`${BASE}/league/${LEAGUE_ID}/matchups/${week}`).catch(() => []),
      Promise.all(
        weekNumbers.map((w) => j<any[]>(`${BASE}/league/${LEAGUE_ID}/transactions/${w}`).catch(() => []))
      ),
    ]);

    let txnWeek = 1;
    txnsByWeek.forEach((tx, i) => {
      if (Array.isArray(tx) && tx.length > 0) txnWeek = weekNumbers[i];
    });

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
