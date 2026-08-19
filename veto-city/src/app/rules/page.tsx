"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";

type RulesPayload = {
  leagueName: string;
  season: string;
  numTeams: number;

  scoringType: string;
  lineup: string[];
  benchSlots: number;
  irSlots: number;
  taxiSlots: number;
  hasKicker: boolean;
  hasDST: boolean;

  draft: { type: string; startTime: number | null; rounds: number | null } | null;

  regularSeasonWeeks: number;
  playoffTeams: number;
  playoffWeekStart: number;
  playoffWeekEnd: number;
  playoffRoundLabel: string | null;

  tradeDeadlineWeek: number;
  vetoVotesNeeded: number;

  waiverType: string;
  waiverBudget: number | null;
  waiverClearDays: number;

  maxKeepers: number;

  scoring: {
    passYd: number;
    passTd: number;
    passInt: number;
    pass2pt: number;
    rushYd: number;
    rushTd: number;
    recYd: number;
    recTd: number;
    rec: number;
    fumLost: number;
    hasKicker: boolean;
    hasDST: boolean;
  };

  error?: string;
};

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(ms: number | null) {
  if (!ms) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return null;
  }
}

function perYardLabel(pts: number) {
  if (!pts) return "0 pts";
  const yardsPerPoint = 1 / pts;
  return Number.isFinite(yardsPerPoint) ? `1 pt / ${yardsPerPoint.toFixed(0)} yds` : `${pts} pts`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_1.4fr] gap-3 border-b border-zinc-800/60 px-4 py-3 last:border-b-0 sm:grid-cols-[180px_1fr]">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-sm font-medium text-zinc-100">{value}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <div className="border-b border-zinc-800/70 bg-zinc-900/40 px-5 py-4">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function RulesPage() {
  const [data, setData] = useState<RulesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/rules", { cache: "no-store" });
        const json = (await res.json()) as RulesPayload;

        if (!res.ok || (json as any).error) {
          throw new Error((json as any).error || `API error ${res.status}`);
        }

        if (!alive) return;
        setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load league rules.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const draftLine = useMemo(() => {
    if (!data?.draft) return "—";
    const bits = [titleCase(data.draft.type), fmtDate(data.draft.startTime), data.draft.rounds ? `${data.draft.rounds} rounds` : null];
    return bits.filter(Boolean).join(" · ") || "—";
  }, [data]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12 pt-6 md:pt-24">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">League Constitution</h1>
          <div className="mt-2 text-sm text-zinc-400">Rules, scoring, and the fine print</div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : loading || !data ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-950/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <Section title="Format & Roster">
              <Row label="League" value={`${data.leagueName}${data.season ? ` (${data.season})` : ""}`} />
              <Row label="Teams" value={`${data.numTeams}`} />
              <Row label="Scoring" value={`Head-to-Head, ${data.scoringType}`} />
              <Row label="Starting Lineup" value={data.lineup.join(", ") || "—"} />
              <Row
                label="Bench / IR / Taxi"
                value={[
                  `${data.benchSlots} Bench`,
                  data.irSlots ? `${data.irSlots} IR` : "no IR",
                  data.taxiSlots ? `${data.taxiSlots} Taxi` : "",
                  !data.hasKicker ? "no kicker" : "",
                  !data.hasDST ? "no D/ST" : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <Row label="Draft" value={draftLine} />
              <Row label="Regular Season" value={`${data.regularSeasonWeeks} weeks`} />
              <Row
                label="Playoffs"
                value={`${data.playoffTeams} teams · Weeks ${data.playoffWeekStart}–${data.playoffWeekEnd}${
                  data.playoffRoundLabel ? ` · ${data.playoffRoundLabel}` : ""
                }`}
              />
              <Row
                label="Trade Deadline"
                value={`Week ${data.tradeDeadlineWeek} · ${data.vetoVotesNeeded} votes to veto`}
              />
              <Row
                label="Waivers"
                value={[
                  data.waiverBudget != null ? `${data.waiverType} $${data.waiverBudget}` : data.waiverType,
                  `${data.waiverClearDays}-day clear`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <Row label="Keepers" value={data.maxKeepers > 0 ? `${data.maxKeepers} allowed` : "None"} />
            </Section>

            <Section title="Scoring" subtitle={data.scoringType}>
              <Row
                label="Passing"
                value={`${perYardLabel(data.scoring.passYd)} · ${data.scoring.passTd} pt/TD · ${data.scoring.passInt} INT${
                  data.scoring.pass2pt ? ` · ${data.scoring.pass2pt} pt/2pt` : ""
                }`}
              />
              <Row
                label="Rushing / Receiving"
                value={`${perYardLabel(data.scoring.rushYd)} · ${data.scoring.rushTd} pt/TD`}
              />
              <Row label="Receptions" value={`${data.scoring.rec} PPR (all positions)`} />
              <Row label="Fumbles" value={`${data.scoring.fumLost} lost`} />
              <Row label="Kicker" value={data.scoring.hasKicker ? "Started" : "None — this league doesn't start a K"} />
              <Row
                label="D/ST"
                value={data.scoring.hasDST ? "Points-allowed tiers + sacks, INTs, fumbles, TDs, safeties" : "None — this league doesn't start a D/ST"}
              />
            </Section>
          </div>
        )}
      </div>
    </main>
  );
}
