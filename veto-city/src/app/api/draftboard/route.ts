import { NextResponse } from "next/server";

const LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// Simple in-memory cache
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function draftSize(d: any) {
  const s = d?.settings || {};
  const rounds = Number(s.rounds || 0) || 0;
  const slots = Number(s.slots || 0) || 0;
  return rounds * slots;
}

function isNonEmptyString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

type LeagueMeta = {
  previous_league_id?: string | null;
  draft_id?: string | null;
  league_id?: string | null;
  season?: string | number | null;
  name?: string | null;
};

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) return NextResponse.json(cache.data);

    // Walk league -> previous_league_id chain (all-time)
    const seen = new Set<string>();
    const leagueIds: string[] = [];
    let cur: string | null = LEAGUE_ID;

    // cap the chain so we never loop forever
    for (let i = 0; i < 25 && cur; i++) {
      if (seen.has(cur)) break;
      seen.add(cur);
      leagueIds.push(cur);

      // ✅ FIX: explicit type annotation prevents TS self-referencing inference bug
      const lg: LeagueMeta = await j<LeagueMeta>(`${BASE}/league/${cur}`);
      const prev = lg?.previous_league_id;
      cur = isNonEmptyString(prev) ? prev : null;
    }

    // Fetch each league + users/rosters + best draft (prefer league.draft_id)
    const all = await Promise.all(
      leagueIds.map(async (lid) => {
        const [league, users, rosters] = await Promise.all([
          j<LeagueMeta>(`${BASE}/league/${lid}`),
          j<any[]>(`${BASE}/league/${lid}/users`).catch(() => []),
          j<any[]>(`${BASE}/league/${lid}/rosters`).catch(() => []),
        ]);

        // Prefer league.draft_id (usually the correct season draft)
        let draftId: string | null = isNonEmptyString(league?.draft_id)
          ? String(league.draft_id)
          : null;

        // If league.draft_id missing, fall back to /drafts and pick largest
        if (!draftId) {
          const drafts = await j<any[]>(`${BASE}/league/${lid}/drafts`).catch(() => []);
          if (Array.isArray(drafts) && drafts.length) {
            const details = await Promise.all(
              drafts
                .filter((d) => isNonEmptyString(d?.draft_id))
                .map((d) => j<any>(`${BASE}/draft/${d.draft_id}`).catch(() => null))
            );

            const best =
              [...details]
                .filter(Boolean)
                .sort((a, b) => {
                  const ds = draftSize(b) - draftSize(a);
                  if (ds !== 0) return ds;
                  const bt = Number(b?.start_time || 0) - Number(a?.start_time || 0);
                  if (bt !== 0) return bt;
                  return 0;
                })[0] ?? null;

            draftId = best?.draft_id ?? null;
          }
        }

        let draft: any | null = null;
        let picks: any[] = [];

        if (draftId) {
          draft = await j<any>(`${BASE}/draft/${draftId}`).catch(() => null);
          picks = await j<any[]>(`${BASE}/draft/${draftId}/picks`).catch(() => []);
        }

        return {
          league,
          users,
          rosters,
          draft,
          picks,
        };
      })
    );

    // Sort by season descending (newest first), with fallback
    const draftsAll = all
      .filter((x) => x?.league?.league_id)
      .sort((a, b) => {
        const as = Number(a.league?.season || 0) || 0;
        const bs = Number(b.league?.season || 0) || 0;
        return bs - as;
      });

    // Backwards-compat: keep "current" as the newest entry
    const current = draftsAll[0] ?? null;

    const data = {
      league: current?.league ?? null,
      users: current?.users ?? [],
      rosters: current?.rosters ?? [],
      draft: current?.draft ?? null,
      picks: current?.picks ?? [],
      // NEW: all-time draftboards
      draftsAll: draftsAll.map((x) => ({
        league: x.league,
        users: x.users,
        rosters: x.rosters,
        draft: x.draft,
        picks: x.picks,
      })),
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: now, data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load draftboard data" },
      { status: 500 }
    );
  }
}
