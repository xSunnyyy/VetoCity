import { NextResponse } from "next/server";

const LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// Simple in-memory cache (works great on Vercel for short bursts, fine locally)
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000; // 60 seconds

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function determineTxnWeek(): Promise<number> {
  for (let w = 18; w >= 1; w--) {
    const tx = await j<any[]>(`${BASE}/league/${LEAGUE_ID}/transactions/${w}`).catch(() => []);
    if (Array.isArray(tx) && tx.length > 0) return w;
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

    const txnWeek = await determineTxnWeek();
    const weeks = Array.from({ length: txnWeek }, (_, i) => i + 1);

    const txnsByWeek = await Promise.all(
      weeks.map((w) => j<any[]>(`${BASE}/league/${LEAGUE_ID}/transactions/${w}`).catch(() => []))
    );
    const transactions = txnsByWeek.flat();

    const data = {
      league,
      users,
      rosters,
      txnWeek,
      transactions,
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: now, data };

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load Sleeper data" },
      { status: 500 }
    );
  }
}
