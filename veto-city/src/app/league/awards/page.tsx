"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";

type Winner = {
  rosterId: number | null;
  name: string;
  avatar: string | null;
};

type SeasonAwards = {
  season: string;
  leagueId: string;
  leagueName: string;
  status: string;
  champion: Winner;
  regSeason: Winner;
  bestManager: Winner;
  toiletBowl: Winner;
};

type AwardsPayload = {
  seasons: SeasonAwards[];
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

function sleeperAvatarThumb(avatar?: string | null) {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/thumbs/${avatar}`;
}

function Avatar({
  name,
  avatar,
  size = 44,
}: {
  name: string;
  avatar: string | null;
  size?: number;
}) {
  const s = `${size}px`;
  const url = sleeperAvatarThumb(avatar);
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      style={{ width: s, height: s }}
      title={name}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-200">
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  accent = "from-zinc-800/25",
  borderAccent = "border-zinc-800/80",
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  borderAccent?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-2xl border bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur",
        borderAccent
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div
          className={cx(
            "absolute inset-0 bg-gradient-to-br",
            accent,
            "via-transparent to-transparent"
          )}
        />
      </div>

      <div className="relative px-5 pt-5">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
        ) : null}
      </div>

      <div className="relative px-5 pb-5 pt-4">{children}</div>
    </div>
  );
}

function WinnerRow({
  label,
  w,
  tone = "text-zinc-500",
}: {
  label: string;
  w: Winner;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4">
      <Avatar name={w.name} avatar={w.avatar} size={40} />
      <div className="min-w-0 flex-1">
        <div className={cx("text-xs font-semibold", tone)}>{label}</div>
        <div className="mt-0.5 truncate text-sm font-semibold text-zinc-200">
          {w?.name || "—"}
        </div>
      </div>
    </div>
  );
}

function seasonNum(season: string) {
  const n = Number(season);
  return Number.isFinite(n) ? n : -1;
}

export default function AwardsPage() {
  const [data, setData] = useState<AwardsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ✅ expanded seasons: keep only the most recent expanded by default
  const [openLeagueId, setOpenLeagueId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/awards", { cache: "no-store" });
        const json = (await res.json()) as AwardsPayload;

        if (!res.ok || (json as any).error) {
          throw new Error((json as any).error || `API error ${res.status}`);
        }

        if (!alive) return;
        setData(json);

        // ✅ auto-collapse all previous seasons: open the newest season only
        const seasons = (json?.seasons ?? []).slice();
        seasons.sort((a, b) => {
          const d = seasonNum(b.season) - seasonNum(a.season);
          return d !== 0 ? d : (b.leagueId || "").localeCompare(a.leagueId || "");
        });
        const newest = seasons[0]?.leagueId ?? null;
        setOpenLeagueId(newest);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load awards.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const seasons = useMemo(() => data?.seasons ?? [], [data]);

  // optional: render newest-to-oldest
  const seasonsSorted = useMemo(() => {
    const arr = seasons.slice();
    arr.sort((a, b) => seasonNum(b.season) - seasonNum(a.season));
    return arr;
  }, [seasons]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-20 md:pt-24">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Awards</h1>
          <div className="mt-1 text-sm text-zinc-400">
            Season awards for every year
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
              >
                <div className="h-4 w-40 rounded bg-zinc-900/50" />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="h-24 rounded-2xl bg-zinc-900/30" />
                  <div className="h-24 rounded-2xl bg-zinc-900/30" />
                  <div className="h-24 rounded-2xl bg-zinc-900/30" />
                </div>
              </div>
            ))}
          </div>
        ) : !seasonsSorted.length ? (
          <div className="text-sm text-zinc-400">No seasons found.</div>
        ) : (
          <div className="space-y-4">
            {seasonsSorted.map((s) => {
              const seasonTitle = s.season ? `Season ${s.season}` : "Season";
              const leagueSub = s.leagueName ? s.leagueName : "League";
              const isOpen = openLeagueId === s.leagueId;

              return (
                <section
                  key={s.leagueId}
                  className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/35 shadow-[0_14px_40px_rgba(0,0,0,0.35)] backdrop-blur"
                >
                  {/* Collapsed header */}
                  <button
                    type="button"
                    onClick={() => setOpenLeagueId((prev) => (prev === s.leagueId ? null : s.leagueId))}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-zinc-100">
                          {seasonTitle}
                        </div>
                        <div className="mt-1 truncate text-xs text-zinc-500">
                          {leagueSub}
                          {s.status ? (
                            <span className="text-zinc-700"> • {s.status}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* quick peek: champion avatar + name */}
                        <div className="hidden items-center gap-2 sm:flex">
                          <Avatar
                            name={s.champion.name}
                            avatar={s.champion.avatar}
                            size={32}
                          />
                          <div className="max-w-[180px] truncate text-sm font-semibold text-amber-200/90">
                            {s.champion.name || "—"}
                          </div>
                        </div>

                        <div
                          className={cx(
                            "flex h-9 w-9 items-center justify-center rounded-full border text-sm transition",
                            isOpen
                              ? "border-zinc-700 bg-zinc-900/50 text-zinc-200"
                              : "border-zinc-800 bg-zinc-950/40 text-zinc-400"
                          )}
                          aria-hidden
                        >
                          {isOpen ? "−" : "+"}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isOpen ? (
                    <div className="px-4 pb-5 pt-1 sm:px-5">
                      {/* Champion on top (centered, larger, gold accent) */}
                      <div className="flex justify-center">
                        <div className="w-full max-w-3xl">
                          <div className="relative">
                            <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-gradient-to-r from-amber-500/10 via-yellow-400/10 to-amber-500/10 blur-2xl" />
                            <Card
                              title="Champion"
                              subtitle="League winner"
                              accent="from-amber-500/22"
                              borderAccent="border-amber-500/30"
                            >
                              <div className="mb-4 flex justify-center">
                                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-zinc-950/55 px-4 py-1.5 text-xs font-semibold text-amber-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                                  <span aria-hidden>🏆</span>
                                  Champion
                                </div>
                              </div>

                              <div className="rounded-2xl border border-amber-500/15 bg-zinc-950/40 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                                  <Avatar
                                    name={s.champion.name}
                                    avatar={s.champion.avatar}
                                    size={68}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold text-amber-200/80">
                                      {seasonTitle} Champion
                                    </div>
                                    <div className="mt-1 truncate text-2xl font-semibold text-zinc-100">
                                      {s.champion.name || "—"}
                                    </div>
                                    {s.champion.rosterId ? (
                                      <div className="mt-1 text-xs text-zinc-500">
                                        Roster {s.champion.rosterId}
                                      </div>
                                    ) : (
                                      <div className="mt-1 text-xs text-zinc-600">—</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Card
                          title="Regular Season Champ"
                          subtitle="Best record"
                          accent="from-emerald-500/16"
                          borderAccent="border-emerald-500/20"
                        >
                          <WinnerRow
                            label="Regular Season Champ"
                            w={s.regSeason}
                            tone="text-emerald-200/70"
                          />
                        </Card>

                        <Card
                          title="Best Manager"
                          subtitle="Highest points for"
                          accent="from-sky-500/16"
                          borderAccent="border-violet-500/20"
                        >
                          <WinnerRow
                            label="Best Manager"
                            w={s.bestManager}
                            tone="text-sky-200/70"
                          />
                        </Card>

                        <Card
                          title="Toilet Bowl Champ"
                          subtitle="Losers bracket winner"
                          accent="from-red-500/10"
                          borderAccent="border-zinc-700/80"
                        >
                          <WinnerRow
                            label="Toilet Bowl Champ"
                            w={s.toiletBowl}
                            tone="text-zinc-400"
                          />
                        </Card>
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}

        {data?.fetchedAt ? (
          <div className="mt-8 text-center text-xs text-zinc-600">
            Updated {new Date(data.fetchedAt).toLocaleString()}
          </div>
        ) : null}
      </div>
    </main>
  );
}
