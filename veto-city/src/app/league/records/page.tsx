"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";

type RecordTeam = {
  rosterId: number | null;
  teamName: string;
  avatar: string | null;
};

type TopEntry = {
  season: string;
  week?: number;
  value: number;
  label: string;
  team: RecordTeam;
  opponent?: RecordTeam;
  note?: string;
};

type RecordsPayload = {
  leagueId: string;
  seasonsCount: number;
  weekRange: { min: number; max: number };
  lists: {
    highestWeekScore: TopEntry[];
    lowestWeekScore: TopEntry[];
    biggestBlowout: TopEntry[];
    closestWin: TopEntry[];
    highestCombined: TopEntry[];
    mostSeasonPF: TopEntry[];
    leastSeasonPA: TopEntry[];
    mostSeasonPA: TopEntry[];
    bestSeasonRecord: TopEntry[];
    worstSeasonRecord: TopEntry[];
  };
  fetchedAt: string;
  error?: string;
};

type ManagerRow = {
  managerId: string;
  managerName: string;
  avatar: string | null;

  wins: number;
  losses: number;
  ties: number;
  winPct: number;

  pointsFor: number;
  pointsAgainst: number;
  pointsPerGame: number;

  possiblePoints: number;
  lineupIQ: number;

  trades: number;
  waivers: number;
};

type ManagersPayload = {
  leagueId: string;
  managersCount: number;
  rows: ManagerRow[];
  fetchedAt: string;
  error?: string;
};

type ManagerView = "lineup" | "wins" | "points" | "txns";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "V";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function Avatar({
  name,
  avatar,
  size = 36,
}: {
  name: string;
  avatar: string | null;
  size?: number;
}) {
  const s = `${size}px`;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      style={{ width: s, height: s }}
      title={name}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-200">
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
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
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

function When(season?: string, week?: number) {
  const s = season ? `Season ${season}` : "";
  const w = week ? `Week ${week}` : "";
  return [s, w].filter(Boolean).join(" • ");
}

/** ✅ Collapsible list card (fixed clickability) */
function ListCard({
  id,
  title,
  subtitle,
  accent,
  items,
  renderRow,
  defaultOpen = true,
}: {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  items: any[];
  renderRow: (item: any, idx: number) => React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div
          className={cx(
            "absolute inset-0 bg-gradient-to-br",
            accent,
            "via-transparent to-transparent"
          )}
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
        aria-controls={id}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-wide text-zinc-100">
            {title}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
        </div>

        <div
          className={cx(
            "flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/60 text-zinc-300 transition",
            open ? "rotate-180" : "rotate-0"
          )}
          aria-hidden
        >
          ▾
        </div>
      </button>

      <div
        id={id}
        className={cx("relative px-5 pb-5", open ? "block" : "hidden")}
      >
        <div className="space-y-2">
          {items.length ? (
            items.slice(0, 10).map((it, i) => (
              <div
                key={`${id}-${it?.season ?? "s"}-${it?.week ?? "w"}-${
                  it?.team?.rosterId ?? it?.team?.teamName ?? i
                }-${i}`}
              >
                {renderRow(it, i + 1)}
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">No data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** ✅ A real table layout for the manager leaderboard */
function ManagerTable({
  view,
  setView,
  rows,
  loading,
}: {
  view: ManagerView;
  setView: (v: ManagerView) => void;
  rows: ManagerRow[];
  loading: boolean;
}) {
  const title =
    view === "lineup"
      ? "All-Time Lineup IQ"
      : view === "wins"
      ? "All-Time Wins"
      : view === "points"
      ? "All-Time Fantasy Points"
      : "All-Time Transactions";

  const accent =
    view === "lineup"
      ? "from-violet-500/14"
      : view === "wins"
      ? "from-emerald-500/14"
      : view === "points"
      ? "from-sky-500/14"
      : "from-amber-500/14";

  const columns =
    view === "lineup"
      ? ["Manager", "Lineup IQ", "Points", "Potential"]
      : view === "wins"
      ? ["Manager", "Win %", "Wins", "Losses"]
      : view === "points"
      ? ["Manager", "Points For", "Points Against", "PPG"]
      : ["Manager", "Trades", "Waivers", "Total"];

  const sorted = useMemo(() => {
    const copy = [...(rows || [])];
    if (view === "lineup") copy.sort((a, b) => b.lineupIQ - a.lineupIQ);
    else if (view === "wins") copy.sort((a, b) => b.winPct - a.winPct);
    else if (view === "points") copy.sort((a, b) => b.pointsFor - a.pointsFor);
    else copy.sort((a, b) => b.trades + b.waivers - (a.trades + a.waivers));
    return copy;
  }, [rows, view]);

  return (
    <div className="space-y-4">
      {/* ✅ Title like Records above */}
      <div className="text-center">
        <div className="text-4xl font-semibold tracking-tight">{title}</div>
      </div>

      {/* dropdown under title */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ManagerView)}
            className="h-10 min-w-[280px] cursor-pointer appearance-none rounded-full border border-zinc-800 bg-zinc-950/60 px-4 pr-10 text-sm font-semibold text-zinc-200 outline-none transition hover:bg-zinc-900/50 focus:border-zinc-700"
          >
            <option value="lineup" className="bg-zinc-950 text-zinc-200">
              Lineup IQ
            </option>
            <option value="wins" className="bg-zinc-950 text-zinc-200">
              Wins
            </option>
            <option value="points" className="bg-zinc-950 text-zinc-200">
              Fantasy Points
            </option>
            <option value="txns" className="bg-zinc-950 text-zinc-200">
              Transactions
            </option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
            ▾
          </div>
        </div>
      </div>

      {/* table card */}
      <Card title={columns.join(" • ")} subtitle={undefined} accent={accent}>
        <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/40">
          <div
            className={cx(
              "grid items-center gap-3 border-b border-zinc-800/70 bg-zinc-950/70 px-4 py-3 text-xs font-semibold text-zinc-400",
              "grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr]"
            )}
          >
            <div>{columns[0]}</div>
            <div className="text-right">{columns[1]}</div>
            <div className="text-right">{columns[2]}</div>
            <div className="text-right">{columns[3]}</div>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 rounded-xl border border-zinc-800/60 bg-zinc-900/20"
                />
              ))}
            </div>
          ) : !sorted.length ? (
            <div className="p-4 text-sm text-zinc-400">No managers found.</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {sorted.map((m, i) => {
                let c2 = "";
                let c3 = "";
                let c4 = "";

                if (view === "lineup") {
                  c2 = `${m.lineupIQ.toFixed(1)}%`;
                  c3 = m.pointsFor.toFixed(1);
                  c4 = m.possiblePoints.toFixed(1);
                } else if (view === "wins") {
                  c2 = `${(m.winPct * 100).toFixed(1)}%`;
                  c3 = String(m.wins);
                  c4 = String(m.losses);
                } else if (view === "points") {
                  c2 = m.pointsFor.toFixed(1);
                  c3 = m.pointsAgainst.toFixed(1);
                  c4 = m.pointsPerGame.toFixed(1);
                } else {
                  c2 = String(m.trades);
                  c3 = String(m.waivers);
                  c4 = String(m.trades + m.waivers);
                }

                return (
                  <div
                    key={`${view}-${m.managerId}`}
                    className={cx(
                      "grid items-center gap-3 px-4 py-3",
                      "grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr]"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-[11px] font-semibold text-zinc-200">
                          {i + 1}
                        </div>
                        <Avatar name={m.managerName} avatar={m.avatar} size={34} />
                        <div className="min-w-0 truncate text-sm font-semibold text-zinc-200">
                          {m.managerName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-sm font-semibold text-zinc-100">{c2}</div>
                    <div className="text-right text-sm font-semibold text-zinc-100">{c3}</div>
                    <div className="text-right text-sm font-semibold text-zinc-100">{c4}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/** ✅ Collapsible wrapper around ManagerTable */
function AllTimeCard({
  managers,
  mgrLoading,
  mgrErr,
  mgrView,
  setMgrView,
}: {
  managers: ManagerRow[];
  mgrLoading: boolean;
  mgrErr: string | null;
  mgrView: ManagerView;
  setMgrView: (v: ManagerView) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-wide text-zinc-100">
            All-Time Rankings
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Lineup IQ • Wins • Fantasy Points • Transactions
          </div>
        </div>

        <div
          className={cx(
            "flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/60 text-zinc-300 transition",
            open ? "rotate-180" : "rotate-0"
          )}
          aria-hidden
        >
          ▾
        </div>
      </button>

      <div className={cx("relative px-5 pb-5", open ? "block" : "hidden")}>
        {mgrErr ? (
          <div className="mb-4 rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{mgrErr}</div>
          </div>
        ) : null}

        <ManagerTable
          view={mgrView}
          setView={setMgrView}
          rows={managers}
          loading={mgrLoading}
        />
      </div>
    </div>
  );
}

export default function RecordsPage() {
  const [data, setData] = useState<RecordsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [mgrData, setMgrData] = useState<ManagersPayload | null>(null);
  const [mgrLoading, setMgrLoading] = useState(true);
  const [mgrErr, setMgrErr] = useState<string | null>(null);

  const [mgrView, setMgrView] = useState<ManagerView>("lineup");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/records", { cache: "no-store" });
        const json = (await res.json()) as RecordsPayload;

        if (!res.ok || (json as any).error) {
          throw new Error((json as any).error || `API error ${res.status}`);
        }

        if (!alive) return;
        setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load records.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadManagers() {
      try {
        setMgrLoading(true);
        setMgrErr(null);

        const res = await fetch("/api/managers", { cache: "no-store" });
        const json = (await res.json()) as ManagersPayload;

        if (!res.ok || (json as any).error) {
          throw new Error((json as any).error || `API error ${res.status}`);
        }

        if (!alive) return;
        setMgrData(json);
      } catch (e: any) {
        if (alive) setMgrErr(e?.message || "Failed to load manager stats.");
      } finally {
        if (alive) setMgrLoading(false);
      }
    }

    loadManagers();
    return () => {
      alive = false;
    };
  }, []);

  const lists = useMemo(() => data?.lists ?? null, [data]);
  const managers = useMemo(() => mgrData?.rows ?? [], [mgrData]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-24">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-semibold tracking-tight">Records</h1>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : null}

        {loading ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
              >
                <div className="h-4 w-52 rounded bg-zinc-900/50" />
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <div key={j} className="h-12 rounded-xl bg-zinc-900/30" />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : !lists ? (
          <div className="text-sm text-zinc-400">No records found.</div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* ✅ Your existing ListCards unchanged */}
              {/* Highest */}
              <ListCard
                id="highest-week"
                title="Highest Week Score"
                subtitle="Top 10"
                accent="from-amber-500/14"
                items={lists.highestWeekScore}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <Avatar name={it.team.teamName} avatar={it.team.avatar} size={34} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">{it.team.teamName}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">{When(it.season, it.week)}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              {/* Lowest */}
              <ListCard
                id="lowest-week"
                title="Lowest Week Score"
                subtitle="Top 10"
                accent="from-zinc-500/16"
                items={lists.lowestWeekScore}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <Avatar name={it.team.teamName} avatar={it.team.avatar} size={34} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">{it.team.teamName}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">{When(it.season, it.week)}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              {/* Rest (unchanged from your paste) */}
              <ListCard
                id="blowouts"
                title="Biggest Blowouts"
                subtitle="Top 10 margins"
                accent="from-rose-500/14"
                items={lists.biggestBlowout}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar name={it.team.teamName} avatar={it.team.avatar} size={30} />
                        {it.opponent ? <Avatar name={it.opponent.teamName} avatar={it.opponent.avatar} size={30} /> : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">
                          {it.team.teamName}
                          {it.opponent ? <span className="text-zinc-500"> vs {it.opponent.teamName}</span> : null}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {When(it.season, it.week)}{it.note ? ` • ${it.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              <ListCard
                id="closest"
                title="Closest Wins"
                subtitle="Top 10 smallest margins"
                accent="from-emerald-500/14"
                items={lists.closestWin}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar name={it.team.teamName} avatar={it.team.avatar} size={30} />
                        {it.opponent ? <Avatar name={it.opponent.teamName} avatar={it.opponent.avatar} size={30} /> : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">
                          {it.team.teamName}
                          {it.opponent ? <span className="text-zinc-500"> vs {it.opponent.teamName}</span> : null}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {When(it.season, it.week)}{it.note ? ` • ${it.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              <ListCard
                id="combined"
                title="Highest Combined Scores"
                subtitle="Top 10 totals"
                accent="from-violet-500/16"
                items={lists.highestCombined}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar name={it.team.teamName} avatar={it.team.avatar} size={30} />
                        {it.opponent ? <Avatar name={it.opponent.teamName} avatar={it.opponent.avatar} size={30} /> : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">
                          {it.team.teamName}
                          {it.opponent ? <span className="text-zinc-500"> vs {it.opponent.teamName}</span> : null}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {When(it.season, it.week)}{it.note ? ` • ${it.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              <ListCard
                id="most-pf"
                title="Most Points For"
                subtitle="Season totals"
                accent="from-sky-500/14"
                items={lists.mostSeasonPF}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <Avatar name={it.team.teamName} avatar={it.team.avatar} size={34} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">{it.team.teamName}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {When(it.season)}{it.note ? ` • ${it.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              <ListCard
                id="least-pa"
                title="Least Points Against"
                subtitle="Season totals"
                accent="from-emerald-500/14"
                items={lists.leastSeasonPA}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <Avatar name={it.team.teamName} avatar={it.team.avatar} size={34} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">{it.team.teamName}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {When(it.season)}{it.note ? ` • ${it.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              <ListCard
                id="most-pa"
                title="Most Points Against"
                subtitle="Season totals"
                accent="from-rose-500/14"
                items={lists.mostSeasonPA}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <Avatar name={it.team.teamName} avatar={it.team.avatar} size={34} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">{it.team.teamName}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {When(it.season)}{it.note ? ` • ${it.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              <ListCard
                id="best"
                title="Best Records"
                subtitle="Season win% (Top 10)"
                accent="from-amber-500/14"
                items={lists.bestSeasonRecord}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <Avatar name={it.team.teamName} avatar={it.team.avatar} size={34} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">{it.team.teamName}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {When(it.season)}{it.note ? ` • ${it.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />

              <ListCard
                id="worst"
                title="Worst Records"
                subtitle="Season win% (Bottom 10)"
                accent="from-zinc-500/14"
                items={lists.worstSeasonRecord}
                defaultOpen={false}
                renderRow={(it: TopEntry, idx) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {idx}
                      </div>
                      <Avatar name={it.team.teamName} avatar={it.team.avatar} size={34} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-200">{it.team.teamName}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500">
                          {When(it.season)}{it.note ? ` • ${it.note}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-zinc-100">{it.label}</div>
                  </div>
                )}
              />
            </section>

            {/* ✅ Collapsible all-time rankings */}
            <div className="mt-10">
              <AllTimeCard
                managers={managers}
                mgrLoading={mgrLoading}
                mgrErr={mgrErr}
                mgrView={mgrView}
                setMgrView={setMgrView}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
