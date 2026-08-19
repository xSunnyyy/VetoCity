"use client";

import { useEffect, useMemo, useState } from "react";

type RulesPayload = {
  leagueName: string;
  season: string;
  numTeams: number;
  scoringType: string;
  lineup: string[];
  benchSlots: number;
  irSlots: number;
  hasKicker: boolean;
  hasDST: boolean;
  draft: { type: string; startTime: number | null; rounds: number | null } | null;
  regularSeasonWeeks: number;
  playoffTeams: number;
  playoffWeekStart: number;
  playoffWeekEnd: number;
  tradeDeadlineWeek: number;
  vetoVotesNeeded: number;
  waiverType: string;
  waiverBudget: number | null;
  error?: string;
};

type Winner = {
  rosterId: number | null;
  managerId: string | null;
  ownerName: string;
  name: string;
  avatar: string | null;
};

type SeasonAwards = { season: string; champion: Winner };

type AwardsPayload = { seasons: SeasonAwards[]; error?: string };

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDraftDate(ms: number | null) {
  if (!ms) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(ms)
    );
  } catch {
    return null;
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-zinc-800/60 px-4 py-2.5 last:border-b-0 sm:grid-cols-[140px_1fr]">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-medium text-zinc-100">{value}</div>
    </div>
  );
}

export function LeagueAtAGlance() {
  const [rules, setRules] = useState<RulesPayload | null>(null);
  const [seasons, setSeasons] = useState<SeasonAwards[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const [rulesRes, awardsRes] = await Promise.all([
          fetch("/api/rules", { cache: "no-store" }),
          fetch("/api/awards", { cache: "no-store" }),
        ]);
        const rulesJson = (await rulesRes.json()) as RulesPayload;
        const awardsJson = (await awardsRes.json()) as AwardsPayload;

        if (!rulesRes.ok || rulesJson.error) throw new Error(rulesJson.error || `API error ${rulesRes.status}`);
        if (!awardsRes.ok || awardsJson.error) throw new Error(awardsJson.error || `API error ${awardsRes.status}`);

        if (!alive) return;
        setRules(rulesJson);
        setSeasons(awardsJson.seasons);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load league info.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const titleLeaders = useMemo(() => {
    const counts = new Map<string, { label: string; titles: number }>();
    for (const s of seasons ?? []) {
      const c = s.champion;
      if (!c?.managerId) continue;
      const label = c.ownerName || c.name;
      const cur = counts.get(c.managerId) ?? { label, titles: 0 };
      cur.titles += 1;
      cur.label = label || cur.label;
      counts.set(c.managerId, cur);
    }
    return [...counts.values()].sort((a, b) => b.titles - a.titles);
  }, [seasons]);

  // seasons come back newest-first
  const reigning = seasons && seasons.length ? seasons[0] : null;

  const draftLine = useMemo(() => {
    if (!rules?.draft) return "—";
    const bits = [titleCase(rules.draft.type), fmtDraftDate(rules.draft.startTime)];
    return bits.filter(Boolean).join(" · ") || "—";
  }, [rules]);

  if (err) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        League at a Glance
      </div>

      {loading || !rules ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="h-72 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-950/60" />
          <div className="h-72 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-950/60" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
            <Row label="League" value={`${rules.leagueName}${rules.season ? ` (${rules.season})` : ""}`} />
            <Row label="Teams / Scoring" value={`${rules.numTeams} · Head-to-Head, ${rules.scoringType}`} />
            <Row label="Lineup" value={rules.lineup.join(", ") || "—"} />
            <Row
              label="Bench / IR"
              value={`${rules.benchSlots} Bench${rules.irSlots ? ` + ${rules.irSlots} IR` : " · no IR"}`}
            />
            <Row label="Draft" value={draftLine} />
            <Row
              label="Regular Season"
              value={`${rules.regularSeasonWeeks} weeks · ${rules.playoffTeams}-team playoffs, Wks ${rules.playoffWeekStart}–${rules.playoffWeekEnd}`}
            />
            <Row
              label="Trade Deadline"
              value={`Week ${rules.tradeDeadlineWeek} · ${rules.vetoVotesNeeded} votes to veto`}
            />
            <Row
              label="Waivers"
              value={rules.waiverBudget != null ? `${rules.waiverType} $${rules.waiverBudget}` : rules.waiverType}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
              <div className="border-b border-zinc-800/70 bg-zinc-900/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Manager · Titles
              </div>
              {titleLeaders.length ? (
                titleLeaders.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-2 text-sm last:border-b-0"
                  >
                    <span className="truncate text-zinc-200">{m.label}</span>
                    <span className="font-semibold text-red-300">{m.titles}</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-zinc-500">No champions yet.</div>
              )}
            </div>

            {reigning?.champion?.rosterId != null ? (
              <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-100 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
                <span className="font-semibold">★ Reigning Champion:</span> {reigning.champion.name}
                {reigning.champion.ownerName ? ` — ${reigning.champion.ownerName}` : ""} ({reigning.season})
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
