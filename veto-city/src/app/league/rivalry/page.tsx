"use client";

import React, { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";

type SeasonBundle = {
  league_id: string;
  season: string;
  name?: string;
  lastWeek: number;
  users: any[];
  rosters: any[];
  weeks: { week: number; matchups: any[] }[];
};

type RivalryAllTimeBundle = {
  rootLeagueId: string;
  seasons: SeasonBundle[]; // newest -> oldest
  fetchedAt: string;
  error?: string;
};

type Team = {
  ownerId: string;
  name: string;
  avatar?: string | null;
};

type GameRow = {
  season: string;
  week: number;
  matchupId: number;
  a: { ownerId: string; name: string; avatar?: string | null; score: number };
  b: { ownerId: string; name: string; avatar?: string | null; score: number };
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function scoreFmt(n: number) {
  return (Math.round((Number(n || 0) as number) * 10) / 10).toFixed(1);
}

function pctFmt(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${Math.round(v * 1000) / 10}%`;
}

function avatarUrl(avatar?: string | null) {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/${avatar}`;
}

function groupWeekMatchups(matchups: any[]) {
  const map = new Map<number, any[]>();
  for (const m of matchups || []) {
    const id = typeof m?.matchup_id === "number" ? m.matchup_id : null;
    if (!id) continue;
    const arr = map.get(id) ?? [];
    arr.push(m);
    map.set(id, arr);
  }
  return map;
}

function buildOwnerTeamsFromSeason(season: SeasonBundle): {
  teams: Team[];
  ownerToDisplay: Map<string, { name: string; avatar?: string | null }>;
  rosterToOwner: Map<number, string>;
} {
  const userById = new Map<string, any>();
  for (const u of season.users || []) {
    if (u?.user_id) userById.set(String(u.user_id), u);
  }

  const rosterToOwner = new Map<number, string>();
  const ownerToDisplay = new Map<string, { name: string; avatar?: string | null }>();

  for (const r of season.rosters || []) {
    const rid = r?.roster_id;
    const ownerId = r?.owner_id ? String(r.owner_id) : null;
    if (typeof rid !== "number" || !ownerId) continue;

    rosterToOwner.set(rid, ownerId);

    const u = userById.get(ownerId);
    const name =
      r?.metadata?.team_name ||
      u?.display_name ||
      u?.username ||
      `Owner ${ownerId.slice(0, 6)}`;

    const avatar = u?.avatar ?? null;

    if (!ownerToDisplay.has(ownerId)) ownerToDisplay.set(ownerId, { name, avatar });
  }

  const teams: Team[] = [];
  for (const [ownerId, disp] of ownerToDisplay.entries()) {
    teams.push({ ownerId, name: disp.name, avatar: disp.avatar ?? null });
  }
  teams.sort((a, b) => a.name.localeCompare(b.name));

  return { teams, ownerToDisplay, rosterToOwner };
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-100">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="px-5 pb-5 pt-4">{children}</div>
    </div>
  );
}

function StatRow({
  label,
  left,
  right,
}: {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr_92px] items-stretch gap-2 sm:grid-cols-[110px_1fr_110px]">
      <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70 px-2 py-3 text-sm font-semibold text-zinc-100">
        {left}
      </div>

      <div className="flex items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-3 text-center text-xs font-semibold tracking-wide text-zinc-200">
        {label.toUpperCase()}
      </div>

      <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70 px-2 py-3 text-sm font-semibold text-zinc-100">
        {right}
      </div>
    </div>
  );
}

function TeamDisplay({
  name,
  avatar,
  align,
}: {
  name: string;
  avatar?: string | null;
  align: "left" | "right";
}) {
  const url = avatarUrl(avatar);

  return (
    <div className={cx("flex items-center gap-3", align === "right" && "justify-end")}>
      {align === "right" ? (
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-semibold text-zinc-100" title={name}>
            {name}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">All-time</div>
        </div>
      ) : null}

      <div className="h-12 w-12 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-extrabold text-zinc-200">
            {(name || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {align === "left" ? (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100" title={name}>
            {name}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">All-time</div>
        </div>
      ) : null}
    </div>
  );
}

export default function RivalryPage() {
  const [bundle, setBundle] = useState<RivalryAllTimeBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [teamA, setTeamA] = useState<string | null>(null);
  const [teamB, setTeamB] = useState<string | null>(null);

  // default collapsed
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/rivalry", { cache: "no-store" });
        const data = (await res.json()) as RivalryAllTimeBundle;

        if (!res.ok || (data as any).error) {
          throw new Error((data as any).error || `API error ${res.status}`);
        }

        if (!alive) return;
        setBundle(data);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load rivalry data.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const canonical = useMemo(() => {
    if (!bundle?.seasons?.length) {
      return {
        teams: [] as Team[],
        ownerToDisplay: new Map<string, { name: string; avatar?: string | null }>(),
      };
    }
    const newest = bundle.seasons[0];
    const { teams, ownerToDisplay } = buildOwnerTeamsFromSeason(newest);
    return { teams, ownerToDisplay };
  }, [bundle]);

  useEffect(() => {
    if (!canonical.teams.length) return;
    if (teamA == null) setTeamA(canonical.teams[0].ownerId);
    if (teamB == null)
      setTeamB(
        canonical.teams.length > 1 ? canonical.teams[1].ownerId : canonical.teams[0].ownerId
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonical.teams.length]);

  const opponentOptions = useMemo(() => {
    if (teamA == null) return canonical.teams;
    return canonical.teams.filter((t) => t.ownerId !== teamA);
  }, [canonical.teams, teamA]);

  const aTeam = useMemo(
    () => canonical.teams.find((t) => t.ownerId === teamA) ?? null,
    [canonical.teams, teamA]
  );
  const bTeam = useMemo(
    () => canonical.teams.find((t) => t.ownerId === teamB) ?? null,
    [canonical.teams, teamB]
  );

  const games: GameRow[] = useMemo(() => {
    if (!bundle?.seasons?.length || !teamA || !teamB) return [];
    const out: GameRow[] = [];

    for (const season of bundle.seasons) {
      const { rosterToOwner, ownerToDisplay } = buildOwnerTeamsFromSeason(season);

      const display = (ownerId: string) =>
        canonical.ownerToDisplay.get(ownerId) ||
        ownerToDisplay.get(ownerId) || { name: ownerId, avatar: null };

      for (const wk of season.weeks || []) {
        const grouped = groupWeekMatchups(wk.matchups);

        for (const [mid, entries] of grouped.entries()) {
          const aEntry = entries.find((x) => {
            const rid = x?.roster_id;
            if (typeof rid !== "number") return false;
            return rosterToOwner.get(rid) === teamA;
          });

          const bEntry = entries.find((x) => {
            const rid = x?.roster_id;
            if (typeof rid !== "number") return false;
            return rosterToOwner.get(rid) === teamB;
          });

          if (!aEntry || !bEntry) continue;

          const aDisp = display(teamA);
          const bDisp = display(teamB);

          out.push({
            season: season.season,
            week: wk.week,
            matchupId: mid,
            a: {
              ownerId: teamA,
              name: aDisp.name,
              avatar: aDisp.avatar ?? null,
              score: Number(aEntry?.points ?? 0),
            },
            b: {
              ownerId: teamB,
              name: bDisp.name,
              avatar: bDisp.avatar ?? null,
              score: Number(bEntry?.points ?? 0),
            },
          });
        }
      }
    }

    out.sort(
      (x, y) =>
        Number(y.season) - Number(x.season) ||
        y.week - x.week ||
        x.matchupId - y.matchupId
    );
    return out;
  }, [bundle, teamA, teamB, canonical.ownerToDisplay]);

  const summary = useMemo(() => {
    let aWins = 0;
    let bWins = 0;
    let ties = 0;
    let pf = 0;
    let pa = 0;

    for (const g of games) {
      pf += g.a.score;
      pa += g.b.score;
      if (g.a.score > g.b.score) aWins++;
      else if (g.b.score > g.a.score) bWins++;
      else ties++;
    }

    const total = Math.max(1, games.length);
    const aWinPct = games.length ? aWins / total : 0;
    const bWinPct = games.length ? bWins / total : 0;

    return {
      games: games.length,
      aWins,
      bWins,
      ties,
      pf,
      pa,
      diff: pf - pa,
      aWinPct,
      bWinPct,
    };
  }, [games]);

  const selectCls =
    "h-10 rounded-full border border-zinc-800/80 bg-zinc-950/60 px-4 text-sm font-semibold text-zinc-100 outline-none transition hover:bg-zinc-900/60 focus:border-zinc-700";
  const subtleBtn =
    "inline-flex h-9 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-900/60";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      {/* narrower page */}
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-24">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Rivalry</h1>
          <div className="mt-1 text-sm text-zinc-400">All-time head-to-head</div>
        </div>

        {err ? (
          <div className="mb-6 rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : null}

        {/* selectors centered on top */}
        <div className="mb-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {loading ? (
            <>
              <div className="h-10 w-full max-w-[16rem] rounded-full bg-zinc-900/40" />
              <div className="h-10 w-full max-w-[16rem] rounded-full bg-zinc-900/40" />
            </>
          ) : (
            <>
              <select
                value={teamA ?? ""}
                onChange={(e) => {
                  const nextA = String(e.target.value);
                  setTeamA(nextA);

                  if (teamB === nextA) {
                    const alt =
                      canonical.teams.find((t) => t.ownerId !== nextA)?.ownerId ?? null;
                    setTeamB(alt);
                  }

                  setHistoryOpen(false);
                }}
                className={cx(selectCls, "w-full sm:w-64")}
              >
                {canonical.teams.map((t) => (
                  <option key={t.ownerId} value={t.ownerId}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={teamB ?? ""}
                onChange={(e) => {
                  setTeamB(String(e.target.value));
                  setHistoryOpen(false);
                }}
                className={cx(selectCls, "w-full sm:w-64")}
              >
                {opponentOptions.map((t) => (
                  <option key={t.ownerId} value={t.ownerId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Card 1: teams ONLY (removed W/T/W boxes) */}
        <Card
          title="Head to Head"
          subtitle={
            loading
              ? "Loading…"
              : summary.games
              ? `${summary.games} games • ${summary.aWins}-${summary.bWins}${
                  summary.ties ? `-${summary.ties}` : ""
                }`
              : "No games found"
          }
        >
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 w-full rounded-2xl bg-zinc-900/30" />
              <div className="h-16 w-full rounded-2xl bg-zinc-900/30" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <TeamDisplay
                    name={aTeam?.name ?? "—"}
                    avatar={aTeam?.avatar ?? null}
                    align="left"
                  />
                  <div className="text-xs font-semibold tracking-[0.25em] text-zinc-500">
                    VS
                  </div>
                  <TeamDisplay
                    name={bTeam?.name ?? "—"}
                    avatar={bTeam?.avatar ?? null}
                    align="right"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Card 2: stats UNDER head-to-head */}
        <div className="mt-4">
          <Card title="Matchup Stats" subtitle="All-time results & scoring">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 w-full rounded-xl bg-zinc-900/30" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <StatRow label="Wins" left={summary.aWins} right={summary.bWins} />
                <StatRow
                  label="Win Rate"
                  left={pctFmt(summary.aWinPct)}
                  right={pctFmt(summary.bWinPct)}
                />
                <StatRow
                  label="Points For"
                  left={scoreFmt(summary.pf)}
                  right={scoreFmt(summary.pa)}
                />
                <StatRow
                  label="Point Diff"
                  left={scoreFmt(summary.diff)}
                  right={scoreFmt(-summary.diff)}
                />
                <StatRow label="Games" left={summary.games} right={summary.games} />
              </div>
            )}
          </Card>
        </div>

        {/* Match history default collapsed */}
        {!loading ? (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-200">Match History</div>
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className={subtleBtn}
              >
                {historyOpen ? "Hide" : "Show"}{" "}
                <span className="ml-2 text-zinc-500">{historyOpen ? "▴" : "▾"}</span>
              </button>
            </div>

            <div
              className={cx(
                "transition-all duration-300 ease-out",
                historyOpen ? "mt-3 max-h-[2000px] opacity-100" : "mt-0 max-h-0 opacity-0"
              )}
              style={{ overflow: "hidden" }}
              aria-hidden={!historyOpen}
            >
              <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="text-sm font-semibold text-zinc-100">Recent Games</div>
                  <div className="text-xs text-zinc-500">{games.length} total</div>
                </div>
                <div className="h-px w-full bg-zinc-800/70" />

                {games.length ? (
                  <div className="divide-y divide-zinc-800/70">
                    {games.slice(0, 25).map((g, idx) => {
                      const aWins = g.a.score > g.b.score;
                      const bWins = g.b.score > g.a.score;

                      return (
                        <div
                          key={`${g.season}-${g.week}-${g.matchupId}-${idx}`}
                          className="px-5 py-4"
                        >
                          <div className="mb-2 text-xs font-semibold tracking-wide text-zinc-500">
                            {g.season} • WEEK {g.week}
                          </div>

                          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40">
                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                              <div
                                className={cx(
                                  "truncate text-sm text-zinc-200",
                                  aWins && "font-semibold"
                                )}
                              >
                                {g.a.name}
                              </div>
                              <div
                                className={cx(
                                  "text-lg text-zinc-100",
                                  aWins ? "font-semibold" : "font-normal"
                                )}
                              >
                                {scoreFmt(g.a.score)}
                              </div>
                            </div>
                            <div className="h-px w-full bg-zinc-800/70" />
                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                              <div
                                className={cx(
                                  "truncate text-sm text-zinc-200",
                                  bWins && "font-semibold"
                                )}
                              >
                                {g.b.name}
                              </div>
                              <div
                                className={cx(
                                  "text-lg text-zinc-100",
                                  bWins ? "font-semibold" : "font-normal"
                                )}
                              >
                                {scoreFmt(g.b.score)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-10 text-sm text-zinc-400">
                    No games found for this pair.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
