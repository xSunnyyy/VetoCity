import { NextResponse } from "next/server";

const LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// short cache
let cache: Record<string, { ts: number; data: any }> = {};
const TTL_MS = 30 * 1000;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

// Use Sleeper state to determine current week (more reliable than “first week with txns”)
async function getCurrentWeek(): Promise<number> {
  const state = await j<any>(`${BASE}/state/nfl`);
  return Number(state?.leg ?? state?.week ?? 1) || 1;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const weekParam = url.searchParams.get("week");

    const currentWeek = await getCurrentWeek();
    const week = Math.max(1, Number(weekParam ?? currentWeek) || currentWeek);

    const key = `w:${week}`;
    const now = Date.now();
    const hit = cache[key];
    if (hit && now - hit.ts < TTL_MS) return NextResponse.json(hit.data);

    const [users, rosters, matchups] = await Promise.all([
      j<any[]>(`${BASE}/league/${LEAGUE_ID}/users`),
      j<any[]>(`${BASE}/league/${LEAGUE_ID}/rosters`),
      j<any[]>(`${BASE}/league/${LEAGUE_ID}/matchups/${week}`),
    ]);

    const data = {
      currentWeek,
      week,
      users,
      rosters,
      matchups,
      fetchedAt: new Date().toISOString(),
    };

    cache[key] = { ts: now, data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load matchups" },
      { status: 500 }
    );
  }
}
