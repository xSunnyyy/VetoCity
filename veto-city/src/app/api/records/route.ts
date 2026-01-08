import { NextResponse } from "next/server";

const LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// Simple in-memory cache
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000; // 60 seconds

// ✅ Weeks 1–14 only
const WEEK_MIN = 1;
const WEEK_MAX = 14;

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

type MatchupRow = {
  roster_id: number;
  matchup_id: number | null;
  points: number;
};

type RecordTeam = {
  rosterId: number | null;
  teamName: string;
  avatar: string | null;
};

type TopEntry = {
  season: string;
  week?: number;
  value: number;
  label: string;
  team: RecordTeam;
  opponent?: RecordTeam;
  note?: string;
};

type RecordsPayload = {
  leagueId: string;
  seasonsCount: number;
  weekRange: { min: number; max: number };
  lists: {
    highestWeekScore: TopEntry[];
    lowestWeekScore: TopEntry[];
    biggestBlowout: TopEntry[];
    closestWin: TopEntry[];
    highestCombined: TopEntry[];
    mostSeasonPF: TopEntry[];
    leastSeasonPA: TopEntry[];
    mostSeasonPA: TopEntry[];
    bestSeasonRecord: TopEntry[];
    worstSeasonRecord: TopEntry[];
  };
  fetchedAt: string;
};

async function getAllLeagueIdsNewestFirst(startLeagueId: string) {
  const ids: string[] = [];
  const seen = new Set<string>();

  let cur: string | null = startLeagueId;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    ids.push(cur);

    const league = await j<any>(`${BASE}/league/${cur}`);
    const prev = league?.previous_league_id ? String(league.previous_league_id) : "";
    cur = prev || null;
  }

  return ids;
}

function top10(arr: TopEntry[], cmp: (a: TopEntry, b: TopEntry) => number) {
  return [...arr].sort(cmp).slice(0, 10);
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data);
    }

    const leagueIds = await getAllLeagueIdsNewestFirst(LEAGUE_ID);

    // --- Accumulators ---
    const highestWeekScore: TopEntry[] = [];
    const lowestWeekScore: TopEntry[] = [];
    const biggestBlowout: TopEntry[] = [];
    const closestWin: TopEntry[] = [];
    const highestCombined: TopEntry[] = [];

    const mostSeasonPF: TopEntry[] = [];
    const leastSeasonPA: TopEntry[] = [];
    const mostSeasonPA: TopEntry[] = [];
    const bestSeasonRecord: TopEntry[] = [];
    const worstSeasonRecord: TopEntry[] = [];

    for (const lid of leagueIds) {
      const [league, users, rosters] = await Promise.all([
        j<any>(`${BASE}/league/${lid}`),
        j<any[]>(`${BASE}/league/${lid}/users`),
        j<any[]>(`${BASE}/league/${lid}/rosters`),
      ]);

      const season = safeStr(league?.season) || "—";

      const userById = new Map<string, any>();
      for (const u of users || []) {
        if (u?.user_id) userById.set(String(u.user_id), u);
      }

      const teamByRosterId = new Map<number, { name: string; avatar: string | null }>();
      for (const r of rosters || []) {
        const rid = Number(r?.roster_id);
        if (!Number.isFinite(rid)) continue;

        const ownerId = r?.owner_id ? String(r.owner_id) : null;
        const u = ownerId ? userById.get(ownerId) : null;

        const teamName =
          safeStr(u?.metadata?.team_name) ||
          safeStr(u?.display_name) ||
          `Team ${rid}`;

        const av = thumb(u?.avatar ?? null);
        teamByRosterId.set(rid, { name: teamName, avatar: av });
      }

      // --- Season totals + record ---
      for (const r of rosters || []) {
        const rid = Number(r?.roster_id);
        if (!Number.isFinite(rid)) continue;

        const t = teamByRosterId.get(rid);
        const team: RecordTeam = {
          rosterId: rid,
          teamName: t?.name ?? `Team ${rid}`,
          avatar: t?.avatar ?? null,
        };

        const wins = Number(r?.settings?.wins ?? 0) || 0;
        const losses = Number(r?.settings?.losses ?? 0) || 0;
        const ties = Number(r?.settings?.ties ?? 0) || 0;

        const pf = pointsFromRosterSettings(r?.settings || {}, "fpts");
        const pa = pointsFromRosterSettings(r?.settings || {}, "fpts_against");

        const games = wins + losses + ties;
        const winPct = games > 0 ? (wins + ties * 0.5) / games : 0;

        mostSeasonPF.push({
          season,
          value: pf,
          label: pf.toFixed(1),
          team,
          note: `Record: ${wins}-${losses}${ties ? `-${ties}` : ""}`,
        });

        leastSeasonPA.push({
          season,
          value: pa,
          label: pa.toFixed(1),
          team,
          note: `Record: ${wins}-${losses}${ties ? `-${ties}` : ""}`,
        });

        mostSeasonPA.push({
          season,
          value: pa,
          label: pa.toFixed(1),
          team,
          note: `Record: ${wins}-${losses}${ties ? `-${ties}` : ""}`,
        });

        bestSeasonRecord.push({
          season,
          value: winPct,
          label: `${wins}-${losses}${ties ? `-${ties}` : ""}`,
          team,
          note: `Win% ${(winPct * 100).toFixed(1)}%`,
        });

        worstSeasonRecord.push({
          season,
          value: winPct,
          label: `${wins}-${losses}${ties ? `-${ties}` : ""}`,
          team,
          note: `Win% ${(winPct * 100).toFixed(1)}%`,
        });
      }

      // ✅ Weekly scan weeks 1–14
      for (let week = WEEK_MIN; week <= WEEK_MAX; week++) {
        const matchups = await j<MatchupRow[]>(`${BASE}/league/${lid}/matchups/${week}`).catch(() => []);

        // single-team high/low
        for (const m of matchups || []) {
          const rid = Number(m?.roster_id);
          const pts = Number(m?.points ?? 0);
          if (!Number.isFinite(rid) || !Number.isFinite(pts)) continue;

          const t = teamByRosterId.get(rid);
          const team: RecordTeam = {
            rosterId: rid,
            teamName: t?.name ?? `Team ${rid}`,
            avatar: t?.avatar ?? null,
          };

          highestWeekScore.push({ season, week, value: pts, label: pts.toFixed(2), team });
          lowestWeekScore.push({ season, week, value: pts, label: pts.toFixed(2), team });
        }

        // matchup pairs
        const byMatchup = new Map<number, MatchupRow[]>();
        for (const m of matchups || []) {
          if (typeof m?.matchup_id !== "number") continue;
          const arr = byMatchup.get(m.matchup_id) ?? [];
          arr.push(m);
          byMatchup.set(m.matchup_id, arr);
        }

        for (const arr of byMatchup.values()) {
          const rows = arr
            .filter((x) => typeof x?.points === "number")
            .map((x) => ({ rid: Number(x.roster_id), pts: Number(x.points) }))
            .filter((x) => Number.isFinite(x.rid) && Number.isFinite(x.pts));

          if (rows.length < 2) continue;

          const sorted = [...rows].sort((a, b) => b.pts - a.pts);
          const a = sorted[0];
          const b = sorted[1];

          const total = a.pts + b.pts;
          const diff = Math.abs(a.pts - b.pts);

          const aTeam = teamByRosterId.get(a.rid);
          const bTeam = teamByRosterId.get(b.rid);

          const tA: RecordTeam = {
            rosterId: a.rid,
            teamName: aTeam?.name ?? `Team ${a.rid}`,
            avatar: aTeam?.avatar ?? null,
          };
          const tB: RecordTeam = {
            rosterId: b.rid,
            teamName: bTeam?.name ?? `Team ${b.rid}`,
            avatar: bTeam?.avatar ?? null,
          };

          highestCombined.push({
            season,
            week,
            value: total,
            label: total.toFixed(2),
            team: tA,
            opponent: tB,
            note: `${a.pts.toFixed(2)} – ${b.pts.toFixed(2)}`,
          });

          const winner = a.pts >= b.pts ? { t: tA, pts: a.pts } : { t: tB, pts: b.pts };
          const loser = a.pts >= b.pts ? { t: tB, pts: b.pts } : { t: tA, pts: a.pts };

          biggestBlowout.push({
            season,
            week,
            value: diff,
            label: diff.toFixed(2),
            team: winner.t,
            opponent: loser.t,
            note: `${winner.pts.toFixed(2)} – ${loser.pts.toFixed(2)}`,
          });

          if (diff > 0) {
            closestWin.push({
              season,
              week,
              value: diff,
              label: diff.toFixed(2),
              team: winner.t,
              opponent: loser.t,
              note: `${winner.pts.toFixed(2)} – ${loser.pts.toFixed(2)}`,
            });
          }
        }
      }
    }

    const payload: RecordsPayload = {
      leagueId: LEAGUE_ID,
      seasonsCount: leagueIds.length,
      weekRange: { min: WEEK_MIN, max: WEEK_MAX },
      lists: {
        highestWeekScore: top10(highestWeekScore, (a, b) => b.value - a.value),
        lowestWeekScore: top10(lowestWeekScore, (a, b) => a.value - b.value),
        biggestBlowout: top10(biggestBlowout, (a, b) => b.value - a.value),
        closestWin: top10(closestWin, (a, b) => a.value - b.value),
        highestCombined: top10(highestCombined, (a, b) => b.value - a.value),
        mostSeasonPF: top10(mostSeasonPF, (a, b) => b.value - a.value),
        leastSeasonPA: top10(leastSeasonPA, (a, b) => a.value - b.value),
        mostSeasonPA: top10(mostSeasonPA, (a, b) => b.value - a.value),
        bestSeasonRecord: top10(bestSeasonRecord, (a, b) => b.value - a.value),
        worstSeasonRecord: top10(worstSeasonRecord, (a, b) => a.value - b.value),
      },
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: now, data: payload };
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load records" }, { status: 500 });
  }
}
