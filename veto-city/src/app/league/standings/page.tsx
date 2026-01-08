"use client";

import React, { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";

type StandingsBundle = {
  league: any;
  users: any[];
  rosters: any[];
  currentWeek: number;
  matchupsByWeek: { week: number; matchups: any[] }[];
  fetchedAt: string;
  error?: string;
};

function scoreFmt(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1);
}

function sleeperAvatarThumb(avatar?: string | null) {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/thumbs/${avatar}`;
}

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "V";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function TeamAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-zinc-200">
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Mode = "regular" | "playoffs";

type SortKey =
  | "wins"
  | "losses"
  | "top6Wins"
  | "top6Losses"
  | "totalWins"
  | "totalLosses"
  | "pf"
  | "pa"
  | "streak";

type SortDir = "asc" | "desc";

function sortIcon(active: boolean, dir: SortDir) {
  if (!active) return <span className="ml-1 text-zinc-600">↕</span>;
  return <span className="ml-1 text-zinc-400">{dir === "asc" ? "↑" : "↓"}</span>;
}

type Row = {
  rosterId: number;
  name: string;
  avatarUrl: string | null;

  wins: number;
  losses: number;
  pf: number;
  pa: number;
  streak: string; // W3 / L2 / —
  weeksCount: number;

  top6Wins: number;
  top6Losses: number;
};

function computeStreak(results: Array<"W" | "L" | "T">): string {
  if (!results.length) return "—";
  let i = results.length - 1;
  const last = results[i];
  if (last === "T") return "—";

  let count = 0;
  while (i >= 0 && results[i] === last) {
    count++;
    i--;
  }
  return `${last}${count}`;
}

function streakToSortable(streak: string) {
  if (!streak || streak === "—") return 0;
  const m = String(streak).match(/^([WL])(\d+)$/);
  if (!m) return 0;
  const sign = m[1] === "W" ? 1 : -1;
  const n = Number(m[2] ?? 0);
  return sign * (Number.isFinite(n) ? n : 0);
}

export default function StandingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<StandingsBundle | null>(null);

  const [mode, setMode] = useState<Mode>("regular");

  // ✅ both-ways sorting on all columns
  const [sortKey, setSortKey] = useState<SortKey>("wins");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/standings", { cache: "no-store" });
        const json = (await res.json()) as StandingsBundle;

        if (!res.ok || (json as any).error) {
          throw new Error((json as any).error || `API error ${res.status}`);
        }

        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load standings.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const { rows, playoffStartWeek, rangeLabel } = useMemo(() => {
    if (!data) {
      return { rows: [] as Row[], playoffStartWeek: 0, rangeLabel: "" };
    }

    const userById = new Map<string, any>();
    for (const u of data.users || []) {
      if (u?.user_id) userById.set(String(u.user_id), u);
    }

    const avatarByRoster: Record<number, string | null> = {};
    const nameByRoster: Record<number, string> = {};

    for (const r of data.rosters || []) {
      const rid = r?.roster_id;
      const ownerId = r?.owner_id;
      const u = ownerId ? userById.get(String(ownerId)) : null;

      if (typeof rid === "number") {
        avatarByRoster[rid] = sleeperAvatarThumb(u?.avatar ?? null);
        nameByRoster[rid] =
          r?.metadata?.team_name || u?.display_name || u?.username || `Team ${rid}`;
      }
    }

    const ps = Number(data.league?.settings?.playoff_week_start ?? 15) || 15;
    const cw = Number(data.currentWeek ?? 1) || 1;

    const startWeek = mode === "playoffs" ? ps : 1;
    const endWeek = mode === "playoffs" ? cw : Math.min(cw, ps - 1);

    const weeksInRange = (data.matchupsByWeek || []).filter(
      (w) => w.week >= startWeek && w.week <= endWeek
    );

    const rangeLabel =
      mode === "playoffs"
        ? `Playoffs • Weeks ${ps}–${cw}`
        : `Regular Season • Weeks 1–${Math.min(cw, ps - 1)}`;

    const stats: Record<
      number,
      {
        wins: number;
        losses: number;
        pf: number;
        pa: number;
        results: Array<"W" | "L" | "T">;
        top6Wins: number;
        top6Losses: number;
      }
    > = {};

    for (const r of data.rosters || []) {
      const rid = r?.roster_id;
      if (typeof rid === "number") {
        stats[rid] = {
          wins: 0,
          losses: 0,
          pf: 0,
          pa: 0,
          results: [],
          top6Wins: 0,
          top6Losses: 0,
        };
      }
    }

    for (const weekPack of weeksInRange) {
      const ms = (weekPack.matchups || []).filter(
        (m: any) =>
          typeof m?.roster_id === "number" &&
          typeof m?.points === "number" &&
          typeof m?.matchup_id === "number"
      );

      const pointsList = ms.map((m: any) => ({
        rosterId: m.roster_id as number,
        points: m.points as number,
        matchupId: m.matchup_id as number,
      }));

      const rosterIdsThisWeek = new Set(pointsList.map((p) => p.rosterId));

      for (const p of pointsList) {
        const st = stats[p.rosterId];
        if (!st) continue;
        st.pf += p.points;
      }

      const sorted = [...pointsList].sort((a, b) => b.points - a.points);
      const top6Set = new Set(sorted.slice(0, 6).map((t) => t.rosterId));

      for (const rid of rosterIdsThisWeek) {
        const st = stats[rid];
        if (!st) continue;
        if (top6Set.has(rid)) st.top6Wins += 1;
        else st.top6Losses += 1;
      }

      const byMatchup = new Map<number, Array<{ rosterId: number; points: number }>>();
      for (const p of pointsList) {
        const arr = byMatchup.get(p.matchupId) ?? [];
        arr.push({ rosterId: p.rosterId, points: p.points });
        byMatchup.set(p.matchupId, arr);
      }

      for (const [, pair] of byMatchup.entries()) {
        if (pair.length < 2) continue;
        const a = pair[0];
        const b = pair[1];

        const aSt = stats[a.rosterId];
        const bSt = stats[b.rosterId];
        if (!aSt || !bSt) continue;

        aSt.pa += b.points;
        bSt.pa += a.points;

        if (a.points > b.points) {
          aSt.wins += 1;
          bSt.losses += 1;
          aSt.results.push("W");
          bSt.results.push("L");
        } else if (b.points > a.points) {
          bSt.wins += 1;
          aSt.losses += 1;
          bSt.results.push("W");
          aSt.results.push("L");
        } else {
          aSt.results.push("T");
          bSt.results.push("T");
        }
      }
    }

    const built: Row[] = Object.entries(stats).map(([ridStr, s]) => {
      const rid = Number(ridStr);
      const streak = computeStreak(s.results);

      return {
        rosterId: rid,
        name: nameByRoster[rid] ?? `Team ${rid}`,
        avatarUrl: avatarByRoster[rid] ?? null,
        wins: s.wins,
        losses: s.losses,
        pf: s.pf,
        pa: s.pa,
        streak,
        weeksCount: weeksInRange.length,
        top6Wins: s.top6Wins,
        top6Losses: s.top6Losses,
      };
    });

    return { rows: built, playoffStartWeek: ps, rangeLabel };
  }, [data, mode]);

  const sortedRows = useMemo(() => {
    const list = [...rows];

    const getVal = (r: Row) => {
      const totalWins = r.wins + r.top6Wins;
      const totalLosses = r.losses + r.top6Losses;

      switch (sortKey) {
        case "wins":
          return r.wins;
        case "losses":
          return r.losses;
        case "top6Wins":
          return r.top6Wins;
        case "top6Losses":
          return r.top6Losses;
        case "totalWins":
          return totalWins;
        case "totalLosses":
          return totalLosses;
        case "pf":
          return r.pf;
        case "pa":
          return r.pa;
        case "streak":
          return streakToSortable(r.streak);
        default:
          return r.wins;
      }
    };

    list.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);

      const primary = sortDir === "asc" ? av - bv : bv - av;
      if (primary !== 0) return primary;

      // stable tie-breakers
      const aTotalW = a.wins + a.top6Wins;
      const bTotalW = b.wins + b.top6Wins;
      return bTotalW - aTotalW || b.wins - a.wins || b.pf - a.pf || a.name.localeCompare(b.name);
    });

    return list;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    setSortKey((prev) => {
      if (prev !== key) {
        setSortDir("desc");
        return key;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
  }

  // ✅ same font sizes as your original table
  // ✅ tighter columns: reduce horizontal padding ONLY (keep py the same)
  const thBtn = "inline-flex items-center hover:text-zinc-200 transition-colors";
  const thTeam = "px-5 py-4";
  const thTight = "px-3 py-4"; // tighter header spacing (was px-5)
  const tdNum = "px-3 py-4 text-sm font-semibold text-zinc-100"; // same font sizes
  const tdSoft = "px-3 py-4 text-sm text-zinc-200"; // same font sizes

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-24">
        <div className="mb-6">
          <div className="text-3xl font-semibold tracking-tight">Standings</div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-400">
              {data ? (
                <>
                  {rangeLabel} • Current week:{" "}
                  <span className="text-zinc-200">Week {data.currentWeek}</span>
                </>
              ) : (
                "Loading…"
              )}
            </div>

            <div className="inline-flex overflow-hidden rounded-full border border-zinc-800/80 bg-zinc-950/60">
              <button
                type="button"
                onClick={() => setMode("regular")}
                className={cx(
                  "h-9 px-4 text-sm",
                  mode === "regular"
                    ? "bg-zinc-900/70 text-zinc-100"
                    : "text-zinc-300 hover:bg-zinc-900/40"
                )}
              >
                Regular Season
              </button>
              <div className="w-px bg-zinc-800/80" />
              <button
                type="button"
                onClick={() => setMode("playoffs")}
                className={cx(
                  "h-9 px-4 text-sm",
                  mode === "playoffs"
                    ? "bg-zinc-900/70 text-zinc-100"
                    : "text-zinc-300 hover:bg-zinc-900/40"
                )}
              >
                Playoffs
              </button>
            </div>
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="h-4 w-44 rounded bg-zinc-900/40" />
            <div className="mt-4 h-60 w-full rounded-xl bg-zinc-900/25" />
          </div>
        ) : null}

        {!loading && !err ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-zinc-950/60">
                  <tr className="text-left text-xs font-semibold tracking-wide text-zinc-400">
                    <th className={thTeam}>Team</th>

                    <th className={thTight}>
                      <button type="button" onClick={() => toggleSort("wins")} className={thBtn}>
                        W{sortIcon(sortKey === "wins", sortDir)}
                      </button>
                    </th>

                    <th className={thTight}>
                      <button type="button" onClick={() => toggleSort("losses")} className={thBtn}>
                        L{sortIcon(sortKey === "losses", sortDir)}
                      </button>
                    </th>

                    <th className={thTight}>
                      <button type="button" onClick={() => toggleSort("top6Wins")} className={thBtn}>
                        Top6 W{sortIcon(sortKey === "top6Wins", sortDir)}
                      </button>
                    </th>

                    <th className={thTight}>
                      <button
                        type="button"
                        onClick={() => toggleSort("top6Losses")}
                        className={thBtn}
                      >
                        Top6 L{sortIcon(sortKey === "top6Losses", sortDir)}
                      </button>
                    </th>

                    <th className={thTight}>
                      <button type="button" onClick={() => toggleSort("totalWins")} className={thBtn}>
                        Total W{sortIcon(sortKey === "totalWins", sortDir)}
                      </button>
                    </th>

                    <th className={thTight}>
                      <button
                        type="button"
                        onClick={() => toggleSort("totalLosses")}
                        className={thBtn}
                      >
                        Total L{sortIcon(sortKey === "totalLosses", sortDir)}
                      </button>
                    </th>

                    <th className={thTight}>
                      <button type="button" onClick={() => toggleSort("pf")} className={thBtn}>
                        PF{sortIcon(sortKey === "pf", sortDir)}
                      </button>
                    </th>

                    <th className={thTight}>
                      <button type="button" onClick={() => toggleSort("pa")} className={thBtn}>
                        PA{sortIcon(sortKey === "pa", sortDir)}
                      </button>
                    </th>

                    <th className={thTight}>
                      <button type="button" onClick={() => toggleSort("streak")} className={thBtn}>
                        Streak{sortIcon(sortKey === "streak", sortDir)}
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map((r, idx) => {
                    const totalW = r.wins + r.top6Wins;
                    const totalL = r.losses + r.top6Losses;

                    return (
                      <tr
                        key={r.rosterId}
                        className="border-t border-zinc-800/70 hover:bg-zinc-900/25"
                      >
                        <td className={thTeam}>
                          <div className="flex items-center gap-3">
                            <div className="w-6 text-xs font-semibold text-zinc-500">{idx + 1}</div>
                            <TeamAvatar name={r.name} avatarUrl={r.avatarUrl} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-zinc-100">
                                {r.name}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                PF {scoreFmt(r.pf)} • PA {scoreFmt(r.pa)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className={tdNum}>{r.wins}</td>
                        <td className={tdNum}>{r.losses}</td>
                        <td className={tdNum}>{r.top6Wins}</td>
                        <td className={tdNum}>{r.top6Losses}</td>
                        <td className={tdNum}>{totalW}</td>
                        <td className={tdNum}>{totalL}</td>

                        <td className={tdSoft}>{scoreFmt(r.pf)}</td>
                        <td className={tdSoft}>{scoreFmt(r.pa)}</td>

                        <td className="px-3 py-4">
                          <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-xs font-semibold text-zinc-200">
                            {r.streak}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data?.fetchedAt ? (
              <div className="border-t border-zinc-800/70 px-5 py-3 text-xs text-zinc-500">
                Updated {new Date(data.fetchedAt).toLocaleString()} • Playoff week start:{" "}
                {playoffStartWeek || "—"}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
