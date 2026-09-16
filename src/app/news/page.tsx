"use client";

import FloatingNav from "@/app/components/FloatingNav";
import { useNewsQuery, NewsNotConfiguredError } from "@/app/hooks/useNewsQuery";

function weekLabel(weekJustPlayed: number | null, upcomingWeek: number | null) {
  if (weekJustPlayed != null) return `Week ${weekJustPlayed} Recap`;
  if (upcomingWeek != null) return `Week ${upcomingWeek} Preview`;
  return "Off-season";
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
        <div className="h-3 w-24 rounded bg-zinc-900/60" />
        <div className="mt-4 h-8 w-2/3 rounded bg-zinc-900/60" />
        <div className="mt-3 h-4 w-1/2 rounded bg-zinc-900/40" />
      </div>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
          >
            <div className="h-4 w-32 rounded bg-zinc-900/50" />
            <div className="mt-4 h-16 w-full rounded-xl bg-zinc-900/30" />
          </div>
        ))}
      </section>
    </div>
  );
}

export default function NewsPage() {
  const { data, isLoading, error } = useNewsQuery();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 md:pt-24">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">News</h1>
          <div className="mt-2 text-sm text-zinc-400">
            Your league&apos;s AI beat writer — funny, opinionated, occasionally libelous about your lineup decisions
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : error instanceof NewsNotConfiguredError ? (
          <div className="rounded-2xl border border-amber-900/50 bg-zinc-950/60 p-6 text-amber-100 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">The beat writer hasn&apos;t clocked in yet</div>
            <div className="mt-2 text-sm text-amber-200/80">
              This page needs an <code className="rounded bg-zinc-900/60 px-1.5 py-0.5 text-amber-100">ANTHROPIC_API_KEY</code>{" "}
              set in the app&apos;s environment to generate articles. Add one in your deployment settings (and
              in <code className="rounded bg-zinc-900/60 px-1.5 py-0.5 text-amber-100">.env.local</code> for local dev),
              then reload this page.
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{error.message}</div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Masthead */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                {weekLabel(data.weekJustPlayed, data.upcomingWeek)}
                {data.season ? ` • ${data.season}` : ""}
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">
                {data.headline}
              </h2>
              <div className="mt-2 text-sm text-zinc-400">{data.standfirst}</div>
              <div className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {data.byline}
              </div>
            </div>

            {/* Recap */}
            {data.recap.length ? (
              <section>
                <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  This Week in the League
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.recap.map((g, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
                    >
                      <div className="text-sm font-semibold text-zinc-100">{g.headline}</div>
                      <div className="mt-2 text-sm leading-relaxed text-zinc-400">{g.body}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Power moves */}
            {data.powerMoves ? (
              <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Waiver Wire Whispers
                </div>
                <div className="text-sm leading-relaxed text-zinc-300">{data.powerMoves}</div>
              </section>
            ) : null}

            {/* Looking ahead */}
            {data.lookingAhead.length ? (
              <section>
                <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Looking Ahead
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.lookingAhead.map((g, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
                    >
                      <div className="text-sm font-semibold text-zinc-100">{g.matchup}</div>
                      <div className="mt-2 text-sm leading-relaxed text-zinc-400">{g.take}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Closing line */}
            {data.closingLine ? (
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-5 text-center text-sm italic text-zinc-500">
                “{data.closingLine}”
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
