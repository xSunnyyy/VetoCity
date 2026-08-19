import { NextResponse } from "next/server";
import { LEAGUE_ID, SLEEPER_BASE as BASE } from "@/app/lib/vetocity";

// In-memory cache
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000; // 60s

const WEEK_MIN = 1;
const WEEK_MAX = 18;

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function thumb(avatar?: string | null) {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/thumbs/${avatar}`;
}

function pointsFromRosterSettings(s: any, key: "fpts" | "fpts_against") {
  const whole = Number(s?.[key] ?? 0) || 0;
  const decKey = key === "fpts" ? "fpts_decimal" : "fpts_against_decimal";
  const dec = Number(s?.[decKey] ?? 0) || 0;
  return whole + dec / 100;
}

async function getAllLeagueIdsOldestFirst(startLeagueId: string): Promise<string[]> {
  const newestFirst: string[] = [];
  const seen = new Set<string>();

  let cur: string | null = startLeagueId;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    newestFirst.push(cur);

    const league: any = await j<any>(`${BASE}/league/${cur}`);
    const prev = league?.previous_league_id ? String(league.previous_league_id) : "";
    cur = prev || null;
  }

  return newestFirst.slice().reverse();
}

function bracketWinnerRosterId(bracket: any[] | null | undefined): number | null {
  if (!Array.isArray(bracket) || !bracket.length) return null;

  const p1 = bracket.find((x) => Number(x?.p) === 1 && Number.isFinite(Number(x?.w)));
  if (p1) return Number(p1.w);

  const withW = bracket
    .filter((x) => Number.isFinite(Number(x?.r)) && Number.isFinite(Number(x?.w)))
    .sort((a, b) => Number(b.r) - Number(a.r));

  if (withW.length) return Number(withW[0].w);
  return null;
}

type SeasonRecord = { wins: number; losses: number; ties: number };

type ManagerAgg = {
  managerId: string;
  managerName: string;
  ownerName: string;
  handle: string | null;
  avatar: string | null;

  firstSeason: string | null;
  lastSeason: string | null;
  seasons: Set<string>;

  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;

  playoffWins: number;
  playoffLosses: number;
  playoffTies: number;

  bestGame: { season: string; week: number; points: number } | null;
  weeklyHighs: number;

  currentStreak: number;
  longestWinStreak: number;

  seasonRecords: Map<string, SeasonRecord>;
  championSeasons: string[];
  lastPlaceSeasons: string[];

  recentTeamNames: { season: string; name: string }[];
};

function initManager(id: string): ManagerAgg {
  return {
    managerId: id,
    managerName: `Manager ${id}`,
    ownerName: "",
    handle: null,
    avatar: null,

    firstSeason: null,
    lastSeason: null,
    seasons: new Set<string>(),

    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,

    playoffWins: 0,
    playoffLosses: 0,
    playoffTies: 0,

    bestGame: null,
    weeklyHighs: 0,

    currentStreak: 0,
    longestWinStreak: 0,

    seasonRecords: new Map(),
    championSeasons: [],
    lastPlaceSeasons: [],

    recentTeamNames: [],
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) return NextResponse.json(cache.data);

    const leagueIds = await getAllLeagueIdsOldestFirst(LEAGUE_ID);
    const managers = new Map<string, ManagerAgg>();
    let earliestSeason: string | null = null;

    for (const lid of leagueIds) {
      const [league, users, rosters, winnersBracket] = await Promise.all([
        j<any>(`${BASE}/league/${lid}`),
        j<any[]>(`${BASE}/league/${lid}/users`).catch(() => []),
        j<any[]>(`${BASE}/league/${lid}/rosters`).catch(() => []),
        j<any[]>(`${BASE}/league/${lid}/winners_bracket`).catch(() => []),
      ]);

      const season = safeStr(league?.season) || "—";
      if (earliestSeason === null) earliestSeason = season;

      const playoffWeekStart = Number(league?.settings?.playoff_week_start ?? 0) || 0;

      const userById = new Map<string, any>();
      for (const u of users || []) if (u?.user_id) userById.set(String(u.user_id), u);

      const ownerByRoster = new Map<number, string>();
      for (const r of rosters || []) {
        const rid = Number(r?.roster_id);
        const ownerId = r?.owner_id ? String(r.owner_id) : "";
        if (!Number.isFinite(rid) || !ownerId) continue;

        ownerByRoster.set(rid, ownerId);

        if (!managers.has(ownerId)) managers.set(ownerId, initManager(ownerId));
        const m = managers.get(ownerId)!;
        const u = userById.get(ownerId);

        const teamName =
          safeStr(u?.metadata?.team_name).trim() ||
          safeStr(u?.display_name).trim() ||
          safeStr(u?.username).trim() ||
          m.managerName;

        m.managerName = teamName;
        const displayName = safeStr(u?.display_name).trim();
        m.ownerName = displayName || m.ownerName;
        // Sleeper's public API doesn't expose a separate username, so use
        // display_name as the closest thing to a manager "handle".
        m.handle = displayName ? `@${displayName}` : m.handle;
        m.avatar = thumb(u?.avatar ?? null) ?? m.avatar;

        if (!m.firstSeason) m.firstSeason = season;
        m.lastSeason = season;
        m.seasons.add(season);

        const last = m.recentTeamNames[m.recentTeamNames.length - 1];
        if (!last || last.name !== teamName) m.recentTeamNames.push({ season, name: teamName });
      }

      // Champion for the season
      const champRid = bracketWinnerRosterId(winnersBracket);
      if (champRid != null) {
        const ownerId = ownerByRoster.get(champRid);
        if (ownerId) managers.get(ownerId)!.championSeasons.push(season);
      }

      // Last place for the season (worst regular-season standing)
      const validRosters = (rosters || []).filter((r) => Number.isFinite(Number(r?.roster_id)));
      if (validRosters.length) {
        const sorted = [...validRosters].sort((a, b) => {
          const A = a?.settings || {};
          const B = b?.settings || {};
          const aWins = Number(A.wins ?? 0) || 0;
          const bWins = Number(B.wins ?? 0) || 0;
          if (bWins !== aWins) return bWins - aWins;

          const aTies = Number(A.ties ?? 0) || 0;
          const bTies = Number(B.ties ?? 0) || 0;
          if (bTies !== aTies) return bTies - aTies;

          const aPf = pointsFromRosterSettings(A, "fpts");
          const bPf = pointsFromRosterSettings(B, "fpts");
          if (bPf !== aPf) return bPf - aPf;

          const aLosses = Number(A.losses ?? 0) || 0;
          const bLosses = Number(B.losses ?? 0) || 0;
          return aLosses - bLosses;
        });

        const lastRid = Number(sorted[sorted.length - 1]?.roster_id);
        const ownerId = ownerByRoster.get(lastRid);
        if (ownerId) managers.get(ownerId)!.lastPlaceSeasons.push(season);
      }

      // Game-by-game scan (chronological within the season) for record, points,
      // weekly highs, best game, playoff record (approximated as games played
      // in weeks at/after playoff_week_start), and win streaks.
      for (let week = WEEK_MIN; week <= WEEK_MAX; week++) {
        const matchups = await j<any[]>(`${BASE}/league/${lid}/matchups/${week}`).catch(() => []);
        if (!Array.isArray(matchups) || !matchups.length) continue;

        const isPlayoffWeek = playoffWeekStart > 0 && week >= playoffWeekStart;

        const byMatchup = new Map<number, any[]>();
        for (const mu of matchups) {
          if (typeof mu?.matchup_id !== "number") continue;
          const arr = byMatchup.get(mu.matchup_id) ?? [];
          arr.push(mu);
          byMatchup.set(mu.matchup_id, arr);
        }

        // Weekly high(s): every roster that posted the max score this week
        const withPoints = matchups
          .map((mu) => ({ rid: Number(mu?.roster_id), pts: Number(mu?.points ?? 0) }))
          .filter((x) => Number.isFinite(x.rid) && Number.isFinite(x.pts));

        if (withPoints.length) {
          const maxPts = Math.max(...withPoints.map((x) => x.pts));
          if (maxPts > 0) {
            for (const { rid, pts } of withPoints) {
              if (pts !== maxPts) continue;
              const ownerId = ownerByRoster.get(rid);
              if (ownerId) managers.get(ownerId)!.weeklyHighs += 1;
            }
          }
        }

        for (const pair of byMatchup.values()) {
          const rows = pair
            .map((x) => ({ rid: Number(x.roster_id), pts: Number(x.points ?? 0) }))
            .filter((x) => Number.isFinite(x.rid));

          if (rows.length !== 2) continue; // only score head-to-head pairs

          const [a, b] = rows;
          const aOwner = ownerByRoster.get(a.rid);
          const bOwner = ownerByRoster.get(b.rid);

          for (const [me, opp, ownerId] of [
            [a, b, aOwner],
            [b, a, bOwner],
          ] as const) {
            if (!ownerId) continue;
            const m = managers.get(ownerId)!;

            m.pointsFor += me.pts;
            m.pointsAgainst += opp.pts;

            if (!m.bestGame || me.pts > m.bestGame.points) {
              m.bestGame = { season, week, points: me.pts };
            }

            const rec = m.seasonRecords.get(season) ?? { wins: 0, losses: 0, ties: 0 };

            if (me.pts > opp.pts) {
              m.wins += 1;
              rec.wins += 1;
              if (isPlayoffWeek) m.playoffWins += 1;
              m.currentStreak = m.currentStreak > 0 ? m.currentStreak + 1 : 1;
              if (m.currentStreak > m.longestWinStreak) m.longestWinStreak = m.currentStreak;
            } else if (me.pts < opp.pts) {
              m.losses += 1;
              rec.losses += 1;
              if (isPlayoffWeek) m.playoffLosses += 1;
              m.currentStreak = 0;
            } else {
              m.ties += 1;
              rec.ties += 1;
              if (isPlayoffWeek) m.playoffTies += 1;
              m.currentStreak = 0;
            }

            m.seasonRecords.set(season, rec);
          }
        }
      }
    }

    const rows = [...managers.values()].map((m) => {
      const games = m.wins + m.losses + m.ties;
      const winPct = games > 0 ? (m.wins + m.ties * 0.5) / games : 0;
      const ppg = games > 0 ? m.pointsFor / games : 0;

      let bestSeason: {
        season: string;
        wins: number;
        losses: number;
        ties: number;
        winPct: number;
      } | null = null;

      for (const [season, rec] of m.seasonRecords.entries()) {
        const g = rec.wins + rec.losses + rec.ties;
        const wp = g > 0 ? (rec.wins + rec.ties * 0.5) / g : 0;
        if (
          !bestSeason ||
          wp > bestSeason.winPct ||
          (wp === bestSeason.winPct && rec.wins > bestSeason.wins)
        ) {
          bestSeason = { season, wins: rec.wins, losses: rec.losses, ties: rec.ties, winPct: wp };
        }
      }

      return {
        managerId: m.managerId,
        managerName: m.managerName,
        ownerName: m.ownerName,
        handle: m.handle,
        avatar: m.avatar,

        firstSeason: m.firstSeason,
        lastSeason: m.lastSeason,
        seasonsPlayed: m.seasons.size,
        foundingMember: !!m.firstSeason && m.firstSeason === earliestSeason,

        championSeasons: m.championSeasons.slice().sort((a, b) => Number(b) - Number(a)),
        lastPlaceSeasons: m.lastPlaceSeasons.slice().sort((a, b) => Number(b) - Number(a)),

        record: { wins: m.wins, losses: m.losses, ties: m.ties, winPct },
        pointsFor: m.pointsFor,
        pointsAgainst: m.pointsAgainst,
        pointsPerGame: ppg,

        playoffs: { wins: m.playoffWins, losses: m.playoffLosses, ties: m.playoffTies },

        bestSeason,
        bestGame: m.bestGame,

        weeklyHighs: m.weeklyHighs,
        longestWinStreak: m.longestWinStreak,

        recentTeamNames: m.recentTeamNames.slice().reverse().slice(0, 5),
      };
    });

    rows.sort((a, b) => b.record.winPct - a.record.winPct);

    const payload = {
      leagueId: LEAGUE_ID,
      managersCount: rows.length,
      rows,
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: now, data: payload };
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load manager cards" },
      { status: 500 }
    );
  }
}
