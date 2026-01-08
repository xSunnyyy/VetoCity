"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";
import { buildTeams } from "../lib/league";

type MatchupRow = {
  roster_id: number;
  matchup_id: number | null;
  points: number;
};

type LeagueBundle = {
  users: any[];
  rosters: any[];
  currentWeek: number;
  matchups: MatchupRow[];
  fetchedAt: string;
  error?: string;
};

const WEEK_MIN = 1;
const WEEK_MAX = 17;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function scoreFmt(n: number) {
  return (Math.round((Number(n) || 0) * 10) / 10).toFixed(1);
}

/** ---------- Avatar helpers ---------- */

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "V";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function sleeperAvatarThumb(avatar?: string | null) {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/thumbs/${avatar}`;
}

function TeamAvatar({
  team,
  avatarUrl,
  size = 32,
}: {
  team: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const s = `${size}px`;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      style={{ width: s, height: s }}
      title={team}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={team} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-200">
          {initials(team)}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  name,
  avatarUrl,
  score,
  win,
}: {
  name: string;
  avatarUrl?: string | null;
  score: number;
  win: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-3">
        <TeamAvatar team={name} avatarUrl={avatarUrl} size={34} />
        <div className="min-w-0">
          <div
            className={cx(
              "truncate text-sm font-semibold",
              win ? "text-zinc-100" : "text-zinc-200"
            )}
          >
            {name}
          </div>
        </div>
      </div>

      <div className={cx("shrink-0 text-lg font-semibold", win ? "text-zinc-100" : "text-zinc-300")}>
        {scoreFmt(score)}
      </div>
    </div>
  );
}

function MatchupCard({
  a,
  b,
  note,
}: {
  a: { name: string; avatarUrl: string | null; score: number };
  b: { name: string; avatarUrl: string | null; score: number };
  note?: string;
}) {
  const aWin = a.score >= b.score;
  const bWin = b.score > a.score;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 via-transparent to-transparent" />
      </div>

      <div className="relative px-5 py-5">
        <TeamRow name={a.name} avatarUrl={a.avatarUrl} score={a.score} win={aWin} />
        <div className="my-4 h-px w-full bg-zinc-800/70" />
        <TeamRow name={b.name} avatarUrl={b.avatarUrl} score={b.score} win={bWin} />

        {note ? <div className="mt-4 text-xs text-zinc-500">{note}</div> : null}
      </div>
    </div>
  );
}

export default function MatchupsPage() {
  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const [teamsMap, setTeamsMap] = useState<Map<number, any>>(new Map());
  const [avatarByRoster, setAvatarByRoster] = useState<Record<number, string | null>>({});
  const [matchups, setMatchups] = useState<MatchupRow[]>([]);

  // initial: get users/rosters, currentWeek, and week data
  useEffect(() => {
    let alive = true;

    async function loadInitial() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/league", { cache: "no-store" });
        const data = (await res.json()) as LeagueBundle;

        if (!res.ok || (data as any).error) {
          throw new Error((data as any).error || `API error ${res.status}`);
        }

        const teams = buildTeams(data.users, data.rosters);
        if (!alive) return;

        setTeamsMap(teams);

        // roster_id -> avatar thumb via users
        const userById = new Map<string, any>();
        for (const u of data.users || []) if (u?.user_id) userById.set(String(u.user_id), u);

        const avMap: Record<number, string | null> = {};
        for (const r of data.rosters || []) {
          const rid = r?.roster_id;
          const ownerId = r?.owner_id;
          const u = ownerId ? userById.get(String(ownerId)) : null;
          const url = sleeperAvatarThumb(u?.avatar ?? null);
          if (typeof rid === "number") avMap[rid] = url;
        }
        setAvatarByRoster(avMap);

        // pick default week = currentWeek (capped to 17)
        const cw = Math.min(WEEK_MAX, Math.max(WEEK_MIN, Number(data.currentWeek || 1) || 1));
        setSelectedWeek(cw);

        // show whatever initial payload has (if matchups exist)
        setMatchups(Array.isArray(data.matchups) ? data.matchups : []);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load matchups.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      alive = false;
    };
  }, []);

  // reload weekly matchups when selectedWeek changes
  useEffect(() => {
    let alive = true;

    async function loadWeekly(w: number) {
      if (!teamsMap || teamsMap.size === 0) return;

      try {
        setWeeklyLoading(true);
        setErr(null);

        const week = Math.min(WEEK_MAX, Math.max(WEEK_MIN, w));
        const res = await fetch(`/api/league?week=${week}`, { cache: "no-store" });
        const data = (await res.json()) as LeagueBundle;

        if (!res.ok || (data as any).error) {
          throw new Error((data as any).error || `API error ${res.status}`);
        }

        if (!alive) return;
        setMatchups(Array.isArray(data.matchups) ? data.matchups : []);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load weekly matchups.");
      } finally {
        if (alive) setWeeklyLoading(false);
      }
    }

    if (!loading) loadWeekly(selectedWeek);

    return () => {
      alive = false;
    };
  }, [selectedWeek, teamsMap, loading]);

  const matchupCards = useMemo(() => {
    if (!teamsMap || teamsMap.size === 0) return [];

    const byMatchup = new Map<number, MatchupRow[]>();
    for (const m of matchups || []) {
      if (typeof m?.matchup_id !== "number") continue;
      const arr = byMatchup.get(m.matchup_id) ?? [];
      arr.push(m);
      byMatchup.set(m.matchup_id, arr);
    }

    const getAvatarUrl = (rid: number) => avatarByRoster[rid] ?? null;

    const cards: Array<{
      id: number;
      a: { name: string; avatarUrl: string | null; score: number };
      b: { name: string; avatarUrl: string | null; score: number };
      note?: string;
    }> = [];

    for (const [mid, rows] of byMatchup.entries()) {
      const cleaned = rows
        .filter((x) => Number.isFinite(Number(x?.roster_id)))
        .map((x) => ({
          roster_id: Number(x.roster_id),
          points: Number(x.points ?? 0) || 0,
        }));

      if (cleaned.length < 2) continue;

      // sort by points desc for display (winner first)
      const sorted = [...cleaned].sort((a, b) => b.points - a.points);
      const a = sorted[0];
      const b = sorted[1];

      const aName = teamsMap.get(a.roster_id)?.name ?? `Team ${a.roster_id}`;
      const bName = teamsMap.get(b.roster_id)?.name ?? `Team ${b.roster_id}`;

      const diff = Math.abs(a.points - b.points);

      cards.push({
        id: mid,
        a: { name: aName, avatarUrl: getAvatarUrl(a.roster_id), score: a.points },
        b: { name: bName, avatarUrl: getAvatarUrl(b.roster_id), score: b.points },
        note: `Margin: ${scoreFmt(diff)}`,
      });
    }

    // stable ordering
    return cards.sort((x, y) => x.id - y.id);
  }, [matchups, teamsMap, avatarByRoster]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-24">
        {/* Header: Matchups centered + week switch centered */}
        <div className="mb-8 space-y-4">
          <h1 className="text-center text-5xl font-semibold tracking-tight">Matchups</h1>

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedWeek((w) => Math.max(WEEK_MIN, w - 1))}
                disabled={selectedWeek <= WEEK_MIN || weeklyLoading}
                className={cx(
                  "h-10 rounded-full border px-3 text-sm transition",
                  selectedWeek <= WEEK_MIN || weeklyLoading
                    ? "border-zinc-800 text-zinc-600"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900/50"
                )}
              >
                ← Prev
              </button>

              <div className="relative">
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-full border border-zinc-800 bg-zinc-950/60 px-4 pr-10 text-sm font-semibold text-zinc-200 outline-none transition hover:bg-zinc-900/50 focus:border-zinc-700"
                >
                  {Array.from({ length: WEEK_MAX }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w} className="bg-zinc-950 text-zinc-200">
                      Week {w}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  ▾
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWeek((w) => Math.min(WEEK_MAX, w + 1))}
                disabled={selectedWeek >= WEEK_MAX || weeklyLoading}
                className={cx(
                  "h-10 rounded-full border px-3 text-sm transition",
                  selectedWeek >= WEEK_MAX || weeklyLoading
                    ? "border-zinc-800 text-zinc-600"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900/50"
                )}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {err ? (
          <div className="mb-6 rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : null}

        {loading ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
              >
                <div className="h-4 w-40 rounded bg-zinc-900/50" />
                <div className="mt-4 h-24 rounded-2xl bg-zinc-900/30" />
              </div>
            ))}
          </section>
        ) : weeklyLoading ? (
          <div className="text-center text-sm text-zinc-400">Loading week…</div>
        ) : !matchupCards.length ? (
          <div className="text-center text-sm text-zinc-400">No matchups found for Week {selectedWeek}.</div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matchupCards.map((m) => (
              <MatchupCard key={m.id} a={m.a} b={m.b} note={m.note} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
