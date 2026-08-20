import { NextResponse } from "next/server";
import { LEAGUE_ID, SLEEPER_BASE as BASE } from "@/app/lib/vetocity";

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
  return { wins, ties, losses, pf };
}

type OwnerInfo = {
  managerId: string | null;
  ownerName: string;
  name: string;
  avatar: string | null;
  wins: number;
  losses: number;
  ties: number;
};

function buildRosterToOwner(users: any[], rosters: any[]) {
  const userById = new Map<string, any>();
  for (const u of users || []) {
    if (u?.user_id) userById.set(String(u.user_id), u);
  }

  const rosterToOwner = new Map<number, OwnerInfo>();
  for (const r of rosters || []) {
    const rid = Number(r?.roster_id);
    if (!Number.isFinite(rid)) continue;

    const ownerId = safeStr(r?.owner_id);
    const u = ownerId ? userById.get(ownerId) : null;

    const ownerName = safeStr(u?.display_name).trim() || safeStr(u?.username).trim();

    const name =
      safeStr(u?.metadata?.team_name).trim() ||
      ownerName ||
      `Team ${rid}`;

    const avatar = u?.avatar ? safeStr(u.avatar) : null;

    const wins = Number(r?.settings?.wins ?? 0) || 0;
    const losses = Number(r?.settings?.losses ?? 0) || 0;
    const ties = Number(r?.settings?.ties ?? 0) || 0;

    rosterToOwner.set(rid, { managerId: ownerId || null, ownerName, name, avatar, wins, losses, ties });
  }

  return rosterToOwner;
}

// Placement games in a Sleeper bracket carry a `p` (place) field: p:1 is the
// championship game (winner takes 1st, loser takes 2nd), p:3 is the 3rd
// place game, etc.
function placementGame(bracket: any[] | null | undefined, place: number) {
  if (!Array.isArray(bracket) || !bracket.length) return null;
  return bracket.find((x) => Number(x?.p) === place) ?? null;
}

function bracketWinnerRosterId(bracket: any[] | null | undefined): number | null {
  if (!Array.isArray(bracket) || !bracket.length) return null;

  const p1 = placementGame(bracket, 1);
  if (p1 && Number.isFinite(Number(p1.w))) return Number(p1.w);

  const withW = bracket
    .filter((x) => Number.isFinite(Number(x?.r)) && Number.isFinite(Number(x?.w)))
    .sort((a, b) => Number(b.r) - Number(a.r));

  if (withW.length) return Number(withW[0].w);
  return null;
}

function rosterInfo(rosterToOwner: Map<number, OwnerInfo>, rid: number | null) {
  if (!rid || !Number.isFinite(rid))
    return { rosterId: null, managerId: null, ownerName: "", name: "—", avatar: null, record: null };
  const o = rosterToOwner.get(rid);
  return {
    rosterId: rid,
    managerId: o?.managerId ?? null,
    ownerName: o?.ownerName ?? "",
    name: o?.name ?? `Team ${rid}`,
    avatar: o?.avatar ?? null,
    record: o ? { wins: o.wins, losses: o.losses, ties: o.ties } : null,
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data);
    }

    const seasons: any[] = [];
    let leagueId: string | null = LEAGUE_ID;

    const seen = new Set<string>();

    while (leagueId && !seen.has(leagueId)) {
      seen.add(leagueId);

      // ✅ explicit annotation fixes TS inference bug
      const leagueData: any = await j<any>(`${BASE}/league/${leagueId}`);

      const [users, rosters, winnersBracket, losersBracket] = await Promise.all([
        j<any[]>(`${BASE}/league/${leagueId}/users`).catch(() => []),
        j<any[]>(`${BASE}/league/${leagueId}/rosters`).catch(() => []),
        j<any[]>(`${BASE}/league/${leagueId}/winners_bracket`).catch(() => []),
        j<any[]>(`${BASE}/league/${leagueId}/losers_bracket`).catch(() => []),
      ]);

      const rosterToOwner = buildRosterToOwner(users, rosters);

      const champRid =
        bracketWinnerRosterId(winnersBracket) ??
        (Number.isFinite(Number(leagueData?.settings?.winner_roster_id))
          ? Number(leagueData.settings.winner_roster_id)
          : null) ??
        (Number.isFinite(Number(leagueData?.metadata?.latest_league_winner_roster_id))
          ? Number(leagueData.metadata.latest_league_winner_roster_id)
          : null);

      const champGame = placementGame(winnersBracket, 1);
      const thirdGame = placementGame(winnersBracket, 3);
      const runnerUpRid =
        champGame && Number.isFinite(Number(champGame.l)) ? Number(champGame.l) : null;
      const thirdRid = thirdGame && Number.isFinite(Number(thirdGame.w)) ? Number(thirdGame.w) : null;

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

      const sortedByPF = [...(rosters || [])]
        .filter((r) => Number.isFinite(Number(r?.roster_id)))
        .sort((a, b) => pfFromRoster(b) - pfFromRoster(a));

      const bestRid = sortedByPF.length ? Number(sortedByPF[0].roster_id) : null;

      const toiletRid = bracketWinnerRosterId(losersBracket);

      // Wall of Shame: the league's worst record for the season (standings-
      // based), not whoever happened to lose a placement/toilet-bowl game.
      const lastPlaceRid = sortedByRecord.length
        ? Number(sortedByRecord[sortedByRecord.length - 1].roster_id)
        : null;

      const seasonLabel = safeStr(leagueData?.season) || "—";

      seasons.push({
        season: seasonLabel,
        leagueId: safeStr(leagueData?.league_id) || leagueId,
        leagueName: safeStr(leagueData?.name) || "League",
        status: safeStr(leagueData?.status) || "",
        champion: rosterInfo(rosterToOwner, champRid),
        runnerUp: rosterInfo(rosterToOwner, runnerUpRid),
        third: rosterInfo(rosterToOwner, thirdRid),
        regSeason: rosterInfo(rosterToOwner, regRid),
        bestManager: rosterInfo(rosterToOwner, bestRid),
        toiletBowl: rosterInfo(rosterToOwner, toiletRid),
        lastPlace: rosterInfo(rosterToOwner, lastPlaceRid),
      });

      const prev = safeStr(leagueData?.previous_league_id).trim();
      leagueId = prev ? prev : null;
    }

    const data = { seasons, fetchedAt: new Date().toISOString() };

    cache = { ts: now, data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load awards" }, { status: 500 });
  }
}
