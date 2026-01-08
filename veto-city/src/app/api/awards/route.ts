import { NextResponse } from "next/server";

const LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// Simple in-memory cache (good on Vercel for short bursts, fine locally)
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function pfFromRoster(r: any): number {
  const s = r?.settings || {};
  const fpts = Number(s.fpts ?? 0) || 0;
  const dec = Number(s.fpts_decimal ?? 0) || 0;
  return fpts + dec / 100;
}

function recordKey(r: any) {
  const s = r?.settings || {};
  const wins = Number(s.wins ?? 0) || 0;
  const ties = Number(s.ties ?? 0) || 0;
  const losses = Number(s.losses ?? 0) || 0;
  const pf = pfFromRoster(r);
  // Sort wins desc, ties desc, PF desc, losses asc
  return { wins, ties, losses, pf };
}

function buildRosterToOwner(users: any[], rosters: any[]) {
  const userById = new Map<string, any>();
  for (const u of users || []) {
    if (u?.user_id) userById.set(String(u.user_id), u);
  }

  const rosterToOwner = new Map<number, { name: string; avatar: string | null }>();
  for (const r of rosters || []) {
    const rid = Number(r?.roster_id);
    if (!Number.isFinite(rid)) continue;

    const ownerId = safeStr(r?.owner_id);
    const u = ownerId ? userById.get(ownerId) : null;

    const name =
      safeStr(u?.metadata?.team_name).trim() ||
      safeStr(u?.display_name).trim() ||
      safeStr(u?.username).trim() ||
      `Team ${rid}`;

    const avatar = u?.avatar ? safeStr(u.avatar) : null;

    rosterToOwner.set(rid, { name, avatar });
  }

  return rosterToOwner;
}

/**
 * Bracket rows look like:
 * { r: 1, m: 1, t1: 3, t2: 6, w: <roster_id|null>, l: <roster_id|null>, p?: number }
 *
 * We determine champion by:
 *  1) bracket row with p === 1 and w exists
 *  2) otherwise, highest round row with w exists
 */
function bracketWinnerRosterId(bracket: any[] | null | undefined): number | null {
  if (!Array.isArray(bracket) || !bracket.length) return null;

  const p1 = bracket.find((x) => Number(x?.p) === 1 && Number.isFinite(Number(x?.w)));
  if (p1) return Number(p1.w);

  // fallback: latest (highest r) game that has a winner
  const withW = bracket
    .filter((x) => Number.isFinite(Number(x?.r)) && Number.isFinite(Number(x?.w)))
    .sort((a, b) => Number(b.r) - Number(a.r));

  if (withW.length) return Number(withW[0].w);

  return null;
}

function rosterInfo(
  rosterToOwner: Map<number, { name: string; avatar: string | null }>,
  rid: number | null
) {
  if (!rid || !Number.isFinite(rid)) return { rosterId: null, name: "—", avatar: null };
  const o = rosterToOwner.get(rid);
  return { rosterId: rid, name: o?.name ?? `Team ${rid}`, avatar: o?.avatar ?? null };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data);
    }

    // Walk league history via previous_league_id (newest -> oldest)
    const seasons: any[] = [];
    let leagueId: string | null = LEAGUE_ID;

    // guard against infinite loops
    const seen = new Set<string>();

    while (leagueId && !seen.has(leagueId)) {
      seen.add(leagueId);

      // ✅ IMPORTANT: rename to avoid TS self-referencing inference bug
      const leagueData = await j<any>(`${BASE}/league/${leagueId}`);

      const [users, rosters, winnersBracket, losersBracket] = await Promise.all([
       _toggle(j<any[]>(`${BASE}/league/${leagueId}/users`)),
       _toggle(j<any[]>(`${BASE}/league/${leagueId}/rosters`)),
        _toggle(j<any[]>(`${BASE}/league/${leagueId}/winners_bracket`)),
        _toggle(j<any[]>(`${BASE}/league/${leagueId}/losers_bracket`)),
      ]);

      const rosterToOwner = buildRosterToOwner(users, rosters);

      // Champion
      const champRid =
        bracketWinnerRosterId(winnersBracket) ??
        (Number.isFinite(Number(leagueData?.settings?.winner_roster_id))
          ? Number(leagueData.settings.winner_roster_id)
          : null) ??
        (Number.isFinite(Number(leagueData?.metadata?.latest_league_winner_roster_id))
          ? Number(leagueData.metadata.latest_league_winner_roster_id)
          : null);

      // Regular Season Champ (best record, tie-break PF)
      const sortedByRecord = [...(rosters || [])]
        .filter((r) => Number.isFinite(Number(r?.roster_id)))
        .sort((a, b) => {
          const A = recordKey(a);
          const B = recordKey(b);

          if (B.wins !== A.wins) return B.wins - A.wins;
          if (B.ties !== A.ties) return B.ties - A.ties;
          if (B.pf !== A.pf) return B.pf - A.pf;
          return A.losses - B.losses;
        });

      const regRid = sortedByRecord.length ? Number(sortedByRecord[0].roster_id) : null;

      // Best Manager (highest PF)
      const sortedByPF = [...(rosters || [])]
        .filter((r) => Number.isFinite(Number(r?.roster_id)))
        .sort((a, b) => pfFromRoster(b) - pfFromRoster(a));

      const bestRid = sortedByPF.length ? Number(sortedByPF[0].roster_id) : null;

      // Toilet Bowl Champ (winner of losers bracket)
      const toiletRid = bracketWinnerRosterId(losersBracket);

      const seasonLabel = safeStr(leagueData?.season) || "—";

      seasons.push({
        season: seasonLabel,
        leagueId: safeStr(leagueData?.league_id) || leagueId,
        leagueName: safeStr(leagueData?.name) || "League",
        status: safeStr(leagueData?.status) || "",
        champion: rosterInfo(rosterToOwner, champRid),
        regSeason: rosterInfo(rosterToOwner, regRid),
        bestManager: rosterInfo(rosterToOwner, bestRid),
        toiletBowl: rosterInfo(rosterToOwner, toiletRid),
      });

      const prev = safeStr(leagueData?.previous_league_id).trim();
      leagueId = prev ? prev : null;
    }

    const data = {
      seasons, // newest -> oldest
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: now, data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load awards" }, { status: 500 });
  }
}

/**
 * Small helper to keep your Promise.all clean (always returns [] on failure)
 */
async function _toggle<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch {
    // @ts-expect-error - used only for arrays in this file
    return [];
  }
}
