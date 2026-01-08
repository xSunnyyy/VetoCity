import { NextResponse } from "next/server";

const LEAGUE_ID = "1245800211851255808";
const BASE = "https://api.sleeper.app/v1";

// In-memory cache
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60 * 1000; // 60s

const WEEK_SCAN_MIN = 1;
const WEEK_SCAN_MAX = 18;

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

function pointsFromRosterSettings(s: any, key: "fpts" | "fpts_against" | "ppts") {
  const whole = Number(s?.[key] ?? 0) || 0;
  const decKey =
    key === "fpts"
      ? "fpts_decimal"
      : key === "fpts_against"
      ? "fpts_against_decimal"
      : "ppts_decimal";
  const dec = Number(s?.[decKey] ?? 0) || 0;
  return whole + dec / 100;
}

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

type ManagerTotals = {
  managerId: string;
  managerName: string;
  avatar: string | null;

  wins: number;
  losses: number;
  ties: number;

  pointsFor: number;
  pointsAgainst: number;
  possiblePoints: number;

  trades: number;
  waivers: number;
};

function initManager(managerId: string) {
  const m: ManagerTotals = {
    managerId,
    managerName: `Manager ${managerId}`,
    avatar: null,

    wins: 0,
    losses: 0,
    ties: 0,

    pointsFor: 0,
    pointsAgainst: 0,
    possiblePoints: 0,

    trades: 0,
    waivers: 0,
  };
  return m;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) return NextResponse.json(cache.data);

    const leagueIds = await getAllLeagueIdsNewestFirst(LEAGUE_ID);

    // managerId -> totals
    const managers = new Map<string, ManagerTotals>();

    for (const lid of leagueIds) {
      const [league, users, rosters] = await Promise.all([
        j<any>(`${BASE}/league/${lid}`),
        j<any[]>(`${BASE}/league/${lid}/users`),
        j<any[]>(`${BASE}/league/${lid}/rosters`),
      ]);

      // user map
      const userById = new Map<string, any>();
      for (const u of users || []) if (u?.user_id) userById.set(String(u.user_id), u);

      // roster_id -> ownerId
      const ownerByRoster = new Map<number, string>();
      for (const r of rosters || []) {
        const rid = Number(r?.roster_id);
        const ownerId = r?.owner_id ? String(r.owner_id) : "";
        if (!Number.isFinite(rid) || !ownerId) continue;
        ownerByRoster.set(rid, ownerId);

        // seed/update manager display info
        if (!managers.has(ownerId)) managers.set(ownerId, initManager(ownerId));
        const m = managers.get(ownerId)!;
        const u = userById.get(ownerId);

        // Prefer team_name if present, fallback to display_name
        const name =
          safeStr(u?.metadata?.team_name) ||
          safeStr(u?.display_name) ||
          m.managerName;

        // Update to latest non-empty info as we traverse newer -> older
        if (!m.managerName || m.managerName.startsWith("Manager ")) m.managerName = name;
        if (!m.avatar) m.avatar = thumb(u?.avatar ?? null);
      }

      // --- Season totals from roster settings (wins/losses/PF/PA/PPts) ---
      for (const r of rosters || []) {
        const rid = Number(r?.roster_id);
        if (!Number.isFinite(rid)) continue;

        const ownerId = ownerByRoster.get(rid);
        if (!ownerId) continue;

        if (!managers.has(ownerId)) managers.set(ownerId, initManager(ownerId));
        const m = managers.get(ownerId)!;

        const wins = Number(r?.settings?.wins ?? 0) || 0;
        const losses = Number(r?.settings?.losses ?? 0) || 0;
        const ties = Number(r?.settings?.ties ?? 0) || 0;

        const pf = pointsFromRosterSettings(r?.settings || {}, "fpts");
        const pa = pointsFromRosterSettings(r?.settings || {}, "fpts_against");
        const ppts = pointsFromRosterSettings(r?.settings || {}, "ppts"); // ✅ Sleeper “possible points”

        m.wins += wins;
        m.losses += losses;
        m.ties += ties;

        m.pointsFor += pf;
        m.pointsAgainst += pa;
        m.possiblePoints += ppts;
      }

      // --- Transactions scan (all-time trades/waivers) ---
      // We scan weeks 1..18 for each league id. If a week is empty, Sleeper returns [].
      for (let week = WEEK_SCAN_MIN; week <= WEEK_SCAN_MAX; week++) {
        const txns = await j<any[]>(`${BASE}/league/${lid}/transactions/${week}`).catch(() => []);
        if (!Array.isArray(txns) || !txns.length) continue;

        for (const t of txns) {
          const type = safeStr(t?.type);

          // trades
          if (type === "trade") {
            const rosterIds: number[] = (t?.roster_ids ?? []).map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n));
            for (const rid of rosterIds) {
              const ownerId = ownerByRoster.get(rid);
              if (!ownerId) continue;
              if (!managers.has(ownerId)) managers.set(ownerId, initManager(ownerId));
              managers.get(ownerId)!.trades += 1;
            }
          }

          // waivers / free agent (count as waivers)
          if (type === "waiver" || type === "free_agent") {
            const rosterIds: number[] = (t?.roster_ids ?? []).map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n));

            // Some transactions may have roster_ids empty; fallback to adds owner
            if (!rosterIds.length && t?.adds) {
              const firstRid = Number(Object.values(t.adds)[0]);
              if (Number.isFinite(firstRid)) rosterIds.push(firstRid);
            }

            for (const rid of rosterIds) {
              const ownerId = ownerByRoster.get(rid);
              if (!ownerId) continue;
              if (!managers.has(ownerId)) managers.set(ownerId, initManager(ownerId));
              managers.get(ownerId)!.waivers += 1;
            }
          }
        }
      }
    }

    // payload rows
    const rows = [...managers.values()].map((m) => {
      const games = m.wins + m.losses + m.ties;
      const winPct = games > 0 ? (m.wins + m.ties * 0.5) / games : 0;

      const ppg = games > 0 ? m.pointsFor / games : 0;

      const lineupIQ =
        m.possiblePoints > 0 ? (m.pointsFor / m.possiblePoints) * 100 : 0;

      return {
        managerId: m.managerId,
        managerName: m.managerName,
        avatar: m.avatar,

        wins: m.wins,
        losses: m.losses,
        ties: m.ties,
        winPct,

        pointsFor: m.pointsFor,
        pointsAgainst: m.pointsAgainst,
        pointsPerGame: ppg,

        possiblePoints: m.possiblePoints,
        lineupIQ,

        trades: m.trades,
        waivers: m.waivers,
      };
    });

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
      { error: e?.message || "Failed to load manager stats" },
      { status: 500 }
    );
  }
}
