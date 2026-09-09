import { NextResponse } from "next/server";
import { LEAGUE_ID, SLEEPER_BASE as BASE } from "@/app/lib/vetocity";
import { getLeagueChainNewestFirst } from "@/app/lib/leagueChain";

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
  return typeof v === "string" && v.length > 0;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) return NextResponse.json(cache.data);

    // Shared, longer-cached chain walk (see leagueChain.ts) — also hands
    // back the full league object per season, so no need to re-fetch
    // `/league/{id}` for each one below.
    const leagueSeasons = await getLeagueChainNewestFirst(LEAGUE_ID, 25);

    const all = await Promise.all(
      leagueSeasons.map(async (league) => {
        const lid = String(league.league_id);
        const [users, rosters] = await Promise.all([
          j<any[]>(`${BASE}/league/${lid}/users`).catch(() => []),
          j<any[]>(`${BASE}/league/${lid}/rosters`).catch(() => []),
        ]);

        let draftId: string | null = isNonEmptyString(league?.draft_id)
          ? league.draft_id
          : null;

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

        return { league, users, rosters, draft, picks };
      })
    );

    const draftsAll = all
      .filter((x) => x?.league?.league_id)
      .sort((a, b) => {
        const as = Number(a.league?.season || 0) || 0;
        const bs = Number(b.league?.season || 0) || 0;
        return bs - as;
      });

    const current = draftsAll[0] ?? null;

    const data = {
      league: current?.league ?? null,
      users: current?.users ?? [],
      rosters: current?.rosters ?? [],
      draft: current?.draft ?? null,
      picks: current?.picks ?? [],
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
