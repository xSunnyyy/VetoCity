"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";

type BestSeason = {
  season: string;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
} | null;

type BestGame = {
  season: string;
  week: number;
  points: number;
} | null;

type ManagerCard = {
  managerId: string;
  managerName: string;
  ownerName: string;
  handle: string | null;
  avatar: string | null;

  firstSeason: string | null;
  lastSeason: string | null;
  seasonsPlayed: number;
  foundingMember: boolean;

  championSeasons: string[];
  lastPlaceSeasons: string[];

  record: { wins: number; losses: number; ties: number; winPct: number };
  pointsFor: number;
  pointsAgainst: number;
  pointsPerGame: number;

  playoffs: { wins: number; losses: number; ties: number };

  bestSeason: BestSeason;
  bestGame: BestGame;

  weeklyHighs: number;
  longestWinStreak: number;

  recentTeamNames: { season: string; name: string }[];
};

type ManagerCardsPayload = {
  leagueId: string;
  managersCount: number;
  rows: ManagerCard[];
  fetchedAt: string;
  error?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "V";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function shortSeason(season: string) {
  return season.length >= 2 ? `'${season.slice(-2)}` : season;
}

function recordStr(w: number, l: number, t: number) {
  return t ? `${w}-${l}-${t}` : `${w}-${l}`;
}

function Avatar({
  name,
  avatar,
  size = 56,
}: {
  name: string;
  avatar: string | null;
  size?: number;
}) {
  const s = `${size}px`;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      style={{ width: s, height: s }}
      title={name}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-200">
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-3 py-2.5">
      <div className="text-base font-semibold text-zinc-100">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

function ManagerCardView({ m }: { m: ManagerCard }) {
  const tenureBits = [
    `${m.seasonsPlayed} yr${m.seasonsPlayed === 1 ? "" : "s"}`,
    m.foundingMember ? "Founding member" : null,
    m.firstSeason ? `since ${m.firstSeason}` : null,
  ].filter(Boolean);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
      </div>

      <div className="relative p-5">
        <div className="flex items-start gap-3">
          <Avatar name={m.managerName} avatar={m.avatar} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-base font-semibold text-zinc-100">{m.managerName}</div>
            </div>
            {m.handle ? (
              <div className="mt-0.5 truncate text-xs text-zinc-500">{m.handle}</div>
            ) : null}
            <div className="mt-1 truncate text-[11px] text-zinc-500">{tenureBits.join(" • ")}</div>
          </div>
        </div>

        {m.championSeasons.length || m.lastPlaceSeasons.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {m.championSeasons.map((s) => (
              <span
                key={`champ-${s}`}
                className="inline-flex items-center gap-1 rounded-full border border-amber-900/50 bg-amber-950/30 px-2 py-0.5 text-[11px] font-medium text-amber-200"
              >
                🏆 {s}
              </span>
            ))}
            {m.lastPlaceSeasons.map((s) => (
              <span
                key={`last-${s}`}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
              >
                💀 {s}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat
            label={`All-Time (${m.seasonsPlayed} szns)`}
            value={recordStr(m.record.wins, m.record.losses, m.record.ties)}
          />
          <Stat label="Win %" value={`${(m.record.winPct * 100).toFixed(1)}%`} />
          <Stat label="PPG" value={m.pointsPerGame.toFixed(1)} />

          <Stat
            label="Playoffs"
            value={recordStr(m.playoffs.wins, m.playoffs.losses, m.playoffs.ties)}
          />
          <Stat
            label={m.bestSeason ? `Best Szn ${shortSeason(m.bestSeason.season)}` : "Best Szn"}
            value={
              m.bestSeason
                ? recordStr(m.bestSeason.wins, m.bestSeason.losses, m.bestSeason.ties)
                : "—"
            }
          />
          <Stat
            label={m.bestGame ? `Best Game ${shortSeason(m.bestGame.season)} Wk${m.bestGame.week}` : "Best Game"}
            value={m.bestGame ? m.bestGame.points.toFixed(1) : "—"}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <div>
            Weekly highs: <span className="font-semibold text-zinc-300">{m.weeklyHighs}</span>
          </div>
          <div>
            Longest win streak:{" "}
            <span className="font-semibold text-zinc-300">{m.longestWinStreak}</span>
          </div>
        </div>

        {m.recentTeamNames.length ? (
          <div className="mt-2 truncate text-[11px] text-zinc-600">
            Recent team names:{" "}
            {m.recentTeamNames.map((t, i) => (
              <span key={`${t.season}-${i}`}>
                {i > 0 ? " · " : ""}
                {shortSeason(t.season)}: {t.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ManagersPage() {
  const [data, setData] = useState<ManagerCardsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/manager-cards", { cache: "no-store" });
        const json = (await res.json()) as ManagerCardsPayload;

        if (!res.ok || (json as any).error) {
          throw new Error((json as any).error || `API error ${res.status}`);
        }

        if (!alive) return;
        setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load managers.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) =>
      `${m.managerName} ${m.ownerName} ${m.handle ?? ""}`.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 md:pt-24">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Managers</h1>
          <div className="mt-2 text-sm text-zinc-400">Manager cards — all-time stats, badges, and history</div>
        </div>

        <div className="mb-6 flex justify-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search managers…"
            className="w-full max-w-sm rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-700"
          />
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : loading ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-900/50" />
                  <div className="h-4 w-40 rounded bg-zinc-900/50" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <div key={j} className="h-14 rounded-xl bg-zinc-900/30" />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : !filtered.length ? (
          <div className="text-sm text-zinc-400">No managers found.</div>
        ) : (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filtered.map((m) => (
              <ManagerCardView key={m.managerId} m={m} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
