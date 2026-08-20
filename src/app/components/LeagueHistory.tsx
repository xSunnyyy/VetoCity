"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDragScroll } from "@/app/lib/useDragScroll";

type Winner = {
  rosterId: number | null;
  managerId: string | null;
  ownerName: string;
  name: string;
  avatar: string | null;
  record: { wins: number; losses: number; ties: number } | null;
};

type SeasonAwards = {
  season: string;
  champion: Winner;
  runnerUp: Winner;
  third: Winner;
  lastPlace: Winner;
};

type AwardsPayload = { seasons: SeasonAwards[]; error?: string };

type ManagerCard = {
  managerId: string;
  managerName: string;
  ownerName: string;
  record: { wins: number; losses: number; ties: number; winPct: number };
  pointsPerGame: number;
  playoffs: { wins: number; losses: number; ties: number };
};

type ManagerCardsPayload = { rows: ManagerCard[]; error?: string };

type TopEntry = { season: string; value: number; label: string; team: { teamName: string }; note?: string };

type RecordsPayload = {
  lists: { bestSeasonRecord: TopEntry[]; mostSeasonPF: TopEntry[] };
  error?: string;
};

function TableSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const dragRef = useDragScroll<HTMLDivElement>();
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <div className="border-b border-zinc-800/70 bg-zinc-900/40 px-4 py-3">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">{title}</div>
        {subtitle ? <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div> : null}
      </div>
      <div ref={dragRef} className="no-scrollbar cursor-grab overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

function PodiumCell({ w }: { w: Winner }) {
  if (w?.rosterId == null) return <span className="text-zinc-600">—</span>;
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-zinc-200">{w.name}</div>
      {w.ownerName ? <div className="truncate text-xs text-zinc-500">{w.ownerName}</div> : null}
    </div>
  );
}

export function LeagueHistory() {
  const [seasons, setSeasons] = useState<SeasonAwards[] | null>(null);
  const [managers, setManagers] = useState<ManagerCard[] | null>(null);
  const [records, setRecords] = useState<RecordsPayload["lists"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const [awardsRes, mgrRes, recRes] = await Promise.all([
          fetch("/api/awards", { cache: "no-store" }),
          fetch("/api/manager-cards", { cache: "no-store" }),
          fetch("/api/records", { cache: "no-store" }),
        ]);

        const awardsJson = (await awardsRes.json()) as AwardsPayload;
        const mgrJson = (await mgrRes.json()) as ManagerCardsPayload;
        const recJson = (await recRes.json()) as RecordsPayload;

        if (!awardsRes.ok || awardsJson.error) throw new Error(awardsJson.error || `API error ${awardsRes.status}`);
        if (!mgrRes.ok || mgrJson.error) throw new Error(mgrJson.error || `API error ${mgrRes.status}`);
        if (!recRes.ok || recJson.error) throw new Error(recJson.error || `API error ${recRes.status}`);

        if (!alive) return;
        setSeasons(awardsJson.seasons);
        setManagers(mgrJson.rows);
        setRecords(recJson.lists);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load league history.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  // seasons come back newest-first; podium/wall want that order too
  const podiumSeasons = seasons ?? [];

  const mostTitles = useMemo(() => {
    const counts = new Map<string, { label: string; titles: number }>();
    for (const s of seasons ?? []) {
      const c = s.champion;
      if (!c?.managerId) continue;
      const cur = counts.get(c.managerId) ?? { label: c.ownerName || c.name, titles: 0 };
      cur.titles += 1;
      counts.set(c.managerId, cur);
    }
    const sorted = [...counts.values()].sort((a, b) => b.titles - a.titles);
    return sorted[0] ?? null;
  }, [seasons]);

  const backToBack = useMemo(() => {
    const asc = [...(seasons ?? [])].sort((a, b) => Number(a.season) - Number(b.season));
    let best: { label: string; years: string[] } | null = null;
    let streak: { managerId: string; label: string; years: string[] } | null = null;

    for (const s of asc) {
      const mid = s.champion?.managerId;
      if (mid && streak && streak.managerId === mid) {
        streak.years.push(s.season);
      } else if (mid) {
        streak = { managerId: mid, label: s.champion.ownerName || s.champion.name, years: [s.season] };
      } else {
        streak = null;
      }
      if (streak && streak.years.length >= 2 && (!best || streak.years.length > best.years.length)) {
        best = { label: streak.label, years: streak.years };
      }
    }

    return best;
  }, [seasons]);

  const mostPlayoffWins = useMemo(() => {
    if (!managers?.length) return null;
    return [...managers].sort((a, b) => b.playoffs.wins - a.playoffs.wins)[0];
  }, [managers]);

  const bestWinPct = useMemo(() => {
    if (!managers?.length) return null;
    return [...managers].sort((a, b) => b.record.winPct - a.record.winPct)[0];
  }, [managers]);

  const bestPPG = useMemo(() => {
    if (!managers?.length) return null;
    return [...managers].sort((a, b) => b.pointsPerGame - a.pointsPerGame)[0];
  }, [managers]);

  const bestRegSeason = records?.bestSeasonRecord?.[0] ?? null;
  const bestScoringSeason = records?.mostSeasonPF?.[0] ?? null;

  if (err) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        League History
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-950/60" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <TableSection title="Year-by-Year Podium">
            <div className="no-scrollbar max-h-[24rem] overflow-y-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-950">
                  <tr className="border-b border-zinc-800/70 text-xs text-zinc-500">
                    <th className="px-4 py-2 font-medium">Yr</th>
                    <th className="px-4 py-2 font-medium">Champion</th>
                    <th className="px-4 py-2 font-medium">Runner-Up</th>
                    <th className="px-4 py-2 font-medium">Third</th>
                  </tr>
                </thead>
                <tbody>
                  {podiumSeasons.map((s) => (
                    <tr key={s.season} className="border-b border-zinc-800/50 last:border-b-0">
                      <td className="px-4 py-2.5 align-top text-xs font-semibold text-zinc-400">{s.season}</td>
                      <td className="px-4 py-2.5 align-top">
                        <PodiumCell w={s.champion} />
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <PodiumCell w={s.runnerUp} />
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <PodiumCell w={s.third} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableSection>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TableSection title="History Superlatives">
              <div className="divide-y divide-zinc-800/60">
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-500">Most Titles</span>
                  <span className="font-medium text-zinc-100">
                    {mostTitles ? `${mostTitles.label} — ${mostTitles.titles}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-500">Back-to-Back</span>
                  <span className="font-medium text-zinc-100">
                    {backToBack ? `${backToBack.label} — ${backToBack.years.join(" & ")}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-500">Most Playoff Wins</span>
                  <span className="font-medium text-zinc-100">
                    {mostPlayoffWins
                      ? `${mostPlayoffWins.ownerName || mostPlayoffWins.managerName} — ${mostPlayoffWins.playoffs.wins}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-500">Best Win %</span>
                  <span className="font-medium text-zinc-100">
                    {bestWinPct
                      ? `${bestWinPct.ownerName || bestWinPct.managerName} — ${(bestWinPct.record.winPct * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-500">Highest Career PPG</span>
                  <span className="font-medium text-zinc-100">
                    {bestPPG ? `${bestPPG.ownerName || bestPPG.managerName} — ${bestPPG.pointsPerGame.toFixed(1)}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-500">Best Reg. Season</span>
                  <span className="font-medium text-zinc-100">
                    {bestRegSeason ? `${bestRegSeason.team.teamName} ${bestRegSeason.label} (${bestRegSeason.season})` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-zinc-500">Highest-Scoring Season</span>
                  <span className="font-medium text-zinc-100">
                    {bestScoringSeason
                      ? `${bestScoringSeason.team.teamName} — ${bestScoringSeason.label} (${bestScoringSeason.season})`
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="flex justify-center border-t border-zinc-800/60 px-4 py-4">
                <Link
                  href="/league/drafts"
                  className="inline-flex h-11 md:h-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/70 px-6 text-sm font-medium hover:bg-zinc-800 transition-colors"
                >
                  View the Draft
                </Link>
              </div>
            </TableSection>

            <TableSection title="Wall of Shame" subtitle="Worst record, by year">
              <div className="no-scrollbar max-h-[24rem] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-950">
                    <tr className="border-b border-zinc-800/70 text-xs text-zinc-500">
                      <th className="px-4 py-2 font-medium">Yr</th>
                      <th className="px-4 py-2 font-medium">Team</th>
                      <th className="px-4 py-2 font-medium text-right">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {podiumSeasons.map((s) => (
                      <tr key={s.season} className="border-b border-zinc-800/50 last:border-b-0">
                        <td className="px-4 py-2.5 align-top text-xs font-semibold text-zinc-400">{s.season}</td>
                        <td className="px-4 py-2.5 align-top">
                          <PodiumCell w={s.lastPlace} />
                        </td>
                        <td className="px-4 py-2.5 align-top text-right text-sm font-medium text-zinc-300">
                          {s.lastPlace?.record
                            ? s.lastPlace.record.ties
                              ? `${s.lastPlace.record.wins}-${s.lastPlace.record.losses}-${s.lastPlace.record.ties}`
                              : `${s.lastPlace.record.wins}-${s.lastPlace.record.losses}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableSection>
          </div>
        </div>
      )}
    </section>
  );
}
