"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";
import { useLeagueDataQuery } from "@/app/hooks/useLeagueDataQuery";
import { usePlayersQuery, type PlayerMap } from "@/app/hooks/usePlayersQuery";
import { buildTeams } from "@/app/lib/league";

type MatchupRow = {
  id: string;
  matchup: string;
  report: string;
  // Present on reports created via the auto-populated form (pulled from
  // Sleeper, with a winner pick). Optional so older, freely-typed entries
  // (matchup as plain text, no roster ids) keep working unchanged.
  rosterIdA?: number;
  rosterIdB?: number;
  teamA?: string;
  teamB?: string;
  winnerRosterId?: number | null;
};

type ReportEntry = {
  id: string;
  title: string;
  matchups: MatchupRow[];
  createdAt: string;
  updatedAt?: string;
  // Same story as above — present on new-style reports only.
  season?: string;
  week?: number;
  leagueId?: string;
};

type MatchupPair = {
  matchupId: number;
  rosterIdA: number;
  rosterIdB: number;
  teamA: string;
  teamB: string;
  startersA: string[];
  startersB: string[];
};

type Pick = { winnerRosterId: number | null; report: string };

const DEFAULT_ROW_COUNT = 6;
const DEFAULT_MAX_WEEKS = 18;

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return "";
  }
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={cx("h-4 w-4 shrink-0 text-zinc-500 light:text-zinc-500 transition-transform", expanded && "rotate-90")}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 6l6 6-6 6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.4 2.6a2.1 2.1 0 0 1 3 3L11 16l-4 1 1-4Z"
      />
    </svg>
  );
}

function winnerName(m: MatchupRow): string | null {
  if (m.winnerRosterId == null) return null;
  if (m.rosterIdA != null && m.rosterIdA === m.winnerRosterId) return m.teamA ?? null;
  if (m.rosterIdB != null && m.rosterIdB === m.winnerRosterId) return m.teamB ?? null;
  return null;
}

function blankRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({ key: `${Date.now()}-${i}-${Math.random()}`, matchup: "", report: "" }));
}

function pairMatchupsByWeek(matchups: any[], teams: Map<number, any>): MatchupPair[] {
  const byMatchup = new Map<number, any[]>();
  for (const m of matchups || []) {
    if (typeof m?.matchup_id !== "number") continue;
    const arr = byMatchup.get(m.matchup_id) ?? [];
    arr.push(m);
    byMatchup.set(m.matchup_id, arr);
  }

  return [...byMatchup.entries()]
    .filter(([, arr]) => arr.length >= 2)
    .sort((a, b) => a[0] - b[0])
    .map(([matchupId, arr]) => {
      const [a, b] = arr;
      const rosterIdA = Number(a.roster_id);
      const rosterIdB = Number(b.roster_id);
      return {
        matchupId,
        rosterIdA,
        rosterIdB,
        teamA: teams.get(rosterIdA)?.name ?? `Team ${rosterIdA}`,
        teamB: teams.get(rosterIdB)?.name ?? `Team ${rosterIdB}`,
        // That week's actual starting lineup (not the roster's current one) —
        // Sleeper includes this per matchup entry.
        startersA: Array.isArray(a.starters) ? a.starters : [],
        startersB: Array.isArray(b.starters) ? b.starters : [],
      };
    });
}

function WinnerButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cx(
        "flex-1 truncate rounded-xl border px-3 py-2 text-center text-sm font-medium transition",
        active
          ? "border-red-800/60 light:border-red-400 bg-red-950/40 light:bg-red-100 text-red-100 light:text-red-800"
          : "border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 text-zinc-300 light:text-zinc-700 hover:bg-zinc-900/50 light:hover:bg-zinc-100"
      )}
    >
      {label}
    </button>
  );
}

function RosterList({ starters, players }: { starters: string[]; players: PlayerMap | null }) {
  if (!starters.length) {
    return <div className="rounded-xl border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 p-3 text-xs text-zinc-500 light:text-zinc-500">No starting lineup set for this week yet.</div>;
  }

  return (
    <div className="divide-y divide-zinc-800/70 light:divide-zinc-200 overflow-hidden rounded-xl border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50">
      {starters.map((pid) => {
        const p = players?.[pid];
        const name = p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(" ") || pid;
        const meta = [p?.position, p?.team].filter(Boolean).join(" · ");
        return (
          <div key={pid} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
            <span className="truncate font-medium text-zinc-200 light:text-zinc-800">{name}</span>
            <span className="shrink-0 text-zinc-500 light:text-zinc-500">{meta}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Editing an entry created before auto-populated matchups existed — no
 * week/roster data to rebuild a picker from, so this keeps the original
 * free-text matchup/report rows editable. */
function LegacyReportForm({
  entry,
  onSaved,
  onCancel,
}: {
  entry: ReportEntry;
  onSaved: (entries: ReportEntry[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [rows, setRows] = useState(() =>
    entry.matchups.length
      ? entry.matchups.map((m, i) => ({ key: `${m.id}-${i}`, matchup: m.matchup, report: m.report }))
      : blankRows(DEFAULT_ROW_COUNT)
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function updateRow(key: string, field: "matchup" | "report", value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, ...blankRows(1)]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const filled = rows.filter((r) => r.matchup.trim() || r.report.trim());
    if (!title.trim() || !filled.length) {
      setErr("Add a title and fill in at least one matchup row.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const res = await fetch("/api/billys-report", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          title,
          matchups: filled.map((r) => ({ matchup: r.matchup, report: r.report })),
        }),
      });
      const json = await res.json();

      if (!res.ok || json.error) throw new Error(json.error || `API error ${res.status}`);

      onSaved(json.entries);
    } catch (e: any) {
      setErr(e?.message || "Failed to save the report.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 space-y-4 rounded-2xl border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)]"
    >
      <div className="text-xs text-zinc-500 light:text-zinc-500">
        This report predates auto-populated matchups, so it&apos;s edited as free text.
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 light:text-zinc-500">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Week 1"
          className="w-full max-w-xs rounded-xl border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 px-3 py-2 text-sm text-zinc-100 light:text-zinc-900 placeholder:text-zinc-600 light:placeholder:text-zinc-400 outline-none focus:border-zinc-700 light:focus:border-zinc-400"
        />
      </div>

      <div>
        <div className="mb-1.5 grid grid-cols-[1fr_1fr_36px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 light:text-zinc-500">
          <span>Matchup</span>
          <span>Report</span>
          <span />
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="grid grid-cols-[1fr_1fr_36px] items-start gap-2">
              <input
                value={r.matchup}
                onChange={(e) => updateRow(r.key, "matchup", e.target.value)}
                placeholder={`Matchup ${i + 1} (e.g. Kingpin vs Allen Bhai)`}
                className="w-full rounded-xl border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 px-3 py-2 text-sm text-zinc-100 light:text-zinc-900 placeholder:text-zinc-600 light:placeholder:text-zinc-400 outline-none focus:border-zinc-700 light:focus:border-zinc-400"
              />
              <textarea
                value={r.report}
                onChange={(e) => updateRow(r.key, "report", e.target.value)}
                placeholder="Billy's take..."
                rows={1}
                className="w-full resize-y rounded-xl border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 px-3 py-2 text-sm text-zinc-100 light:text-zinc-900 placeholder:text-zinc-600 light:placeholder:text-zinc-400 outline-none focus:border-zinc-700 light:focus:border-zinc-400"
              />
              <button
                type="button"
                onClick={() => removeRow(r.key)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 light:text-zinc-500 transition hover:bg-zinc-900/60 light:hover:bg-zinc-100 hover:text-red-300 light:hover:text-red-700"
                aria-label="Remove row"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 px-4 text-sm font-medium text-zinc-300 light:text-zinc-700 transition hover:bg-zinc-900/50 light:hover:bg-zinc-100"
        >
          <span className="text-base leading-none">+</span> Add Matchup
        </button>
      </div>

      {err ? <div className="text-sm text-red-300 light:text-red-700">{err}</div> : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-10 rounded-full border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 px-4 text-sm font-medium text-zinc-300 light:text-zinc-700 transition hover:bg-zinc-900/50 light:hover:bg-zinc-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-full border border-red-800/60 light:border-red-400 bg-red-950/40 light:bg-red-100 px-5 text-sm font-semibold text-red-200 light:text-red-800 transition hover:bg-red-900/40 light:hover:bg-red-200 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

/** The auto-populated form: pick a week, that week's real matchups load
 * from Sleeper, pick a winner and write a take per matchup. Used both for
 * adding a new report and for editing an existing new-style one (the week
 * stays fixed while editing). */
function ReportForm({
  mode,
  initialEntry,
  defaultWeek,
  onSaved,
  onCancel,
}: {
  mode: "add" | "edit";
  initialEntry?: ReportEntry;
  defaultWeek: number;
  onSaved: (entries: ReportEntry[]) => void;
  onCancel: () => void;
}) {
  const [week, setWeek] = useState<number>(initialEntry?.week ?? defaultWeek);
  const leagueQuery = useLeagueDataQuery({ week });
  const playersQuery = usePlayersQuery();
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const seededRef = useRef(false);

  // Which matchups have both starting lineups expanded — one toggle opens
  // or closes both sides together, since you're always comparing the pair.
  const [expandedRosters, setExpandedRosters] = useState<Set<number>>(new Set());

  function toggleRoster(key: number) {
    setExpandedRosters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const data = leagueQuery.data;
  const teams = useMemo(() => (data ? buildTeams(data.users, data.rosters) : new Map()), [data]);
  const pairs = useMemo(() => (data ? pairMatchupsByWeek(data.matchups, teams) : []), [data, teams]);
  const maxWeek = Math.max(DEFAULT_MAX_WEEKS, data?.maxWeek ?? 0);
  const season = data?.league?.season ? String(data.league.season) : "";

  // Clamp a computed "next week" default down once we know the real max.
  useEffect(() => {
    if (data && week > maxWeek) setWeek(maxWeek);
  }, [data, maxWeek, week]);

  // Seed picks once from the saved entry (edit mode), or fill in blanks for
  // any newly-loaded matchups without wiping picks already made (add mode).
  useEffect(() => {
    if (!pairs.length) return;

    if (mode === "edit" && initialEntry && !seededRef.current) {
      seededRef.current = true;

      const byPair = new Map<string, MatchupRow>();
      for (const m of initialEntry.matchups) {
        if (m.rosterIdA != null && m.rosterIdB != null) {
          byPair.set(`${m.rosterIdA}-${m.rosterIdB}`, m);
          byPair.set(`${m.rosterIdB}-${m.rosterIdA}`, m);
        }
      }

      const seeded: Record<number, Pick> = {};
      for (const p of pairs) {
        const saved = byPair.get(`${p.rosterIdA}-${p.rosterIdB}`);
        seeded[p.matchupId] = {
          winnerRosterId: saved?.winnerRosterId ?? null,
          report: saved?.report ?? "",
        };
      }
      setPicks(seeded);
      return;
    }

    setPicks((prev) => {
      const next = { ...prev };
      for (const p of pairs) {
        if (!next[p.matchupId]) next[p.matchupId] = { winnerRosterId: null, report: "" };
      }
      return next;
    });
  }, [pairs, mode, initialEntry]);

  function setPick(matchupId: number, patch: Partial<Pick>) {
    setPicks((prev) => ({
      ...prev,
      [matchupId]: { ...(prev[matchupId] ?? { winnerRosterId: null, report: "" }), ...patch },
    }));
  }

  function changeWeek(w: number) {
    setWeek(w);
    setPicks({}); // new week, new matchups — old picks don't carry over
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const filled = pairs
      .map((p) => {
        const pick = picks[p.matchupId];
        if (!pick || (!pick.report.trim() && pick.winnerRosterId == null)) return null;
        return {
          rosterIdA: p.rosterIdA,
          rosterIdB: p.rosterIdB,
          teamA: p.teamA,
          teamB: p.teamB,
          winnerRosterId: pick.winnerRosterId,
          matchup: `${p.teamA} vs ${p.teamB}`,
          report: pick.report.trim(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    if (!filled.length) {
      setErr("Pick a winner or add a take for at least one matchup.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const title = `Week ${week}${season ? ` (${season})` : ""}`;

      const res = await fetch("/api/billys-report", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialEntry?.id,
          title,
          week,
          season,
          leagueId: data?.league?.league_id,
          matchups: filled,
        }),
      });
      const json = await res.json();

      if (!res.ok || json.error) throw new Error(json.error || `API error ${res.status}`);

      onSaved(json.entries);
    } catch (e: any) {
      setErr(e?.message || "Failed to save the report.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 space-y-4 rounded-2xl border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)]"
    >
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 light:text-zinc-500">
          Week
        </label>
        {mode === "edit" ? (
          <div className="text-sm font-semibold text-zinc-100 light:text-zinc-900">
            Week {week}
            {season ? ` (${season})` : ""}
          </div>
        ) : (
          <select
            value={week}
            onChange={(e) => changeWeek(Number(e.target.value))}
            className="h-10 w-40 cursor-pointer rounded-xl border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 px-3 text-sm text-zinc-100 light:text-zinc-900 outline-none focus:border-zinc-700 light:focus:border-zinc-400"
          >
            {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w} className="bg-zinc-950 light:bg-white text-zinc-200 light:text-zinc-800">
                Week {w}
              </option>
            ))}
          </select>
        )}
      </div>

      {leagueQuery.isLoading ? (
        <div className="text-sm text-zinc-400 light:text-zinc-600">Loading matchups…</div>
      ) : leagueQuery.error ? (
        <div className="text-sm text-red-300 light:text-red-700">Couldn&apos;t load matchups for that week.</div>
      ) : !pairs.length ? (
        <div className="text-sm text-zinc-400 light:text-zinc-600">No matchups found for this week yet.</div>
      ) : (
        <div className="space-y-3">
          {pairs.map((p) => {
            const pick = picks[p.matchupId] ?? { winnerRosterId: null, report: "" };
            const sides = [
              { key: "A", rosterId: p.rosterIdA, name: p.teamA, starters: p.startersA },
              { key: "B", rosterId: p.rosterIdB, name: p.teamB, starters: p.startersB },
            ] as const;

            const rostersOpen = expandedRosters.has(p.matchupId);

            return (
              <div key={p.matchupId} className="rounded-xl border border-zinc-800 light:border-zinc-200 bg-zinc-950/40 light:bg-zinc-50 p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 light:text-zinc-500">Who wins?</div>
                  <button
                    type="button"
                    onClick={() => toggleRoster(p.matchupId)}
                    aria-expanded={rostersOpen}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 light:text-zinc-600 transition hover:text-zinc-200 light:hover:text-zinc-800"
                  >
                    <ChevronIcon expanded={rostersOpen} />
                    {rostersOpen ? "Hide rosters" : "View rosters"}
                  </button>
                </div>

                <div className="flex gap-2">
                  {sides.map((side) => (
                    <WinnerButton
                      key={side.key}
                      label={side.name}
                      active={pick.winnerRosterId === side.rosterId}
                      onClick={() => setPick(p.matchupId, { winnerRosterId: side.rosterId })}
                    />
                  ))}
                </div>

                {rostersOpen ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {sides.map((side) => (
                      <div key={side.key} className="min-w-0">
                        <RosterList starters={side.starters} players={playersQuery.data ?? null} />
                      </div>
                    ))}
                  </div>
                ) : null}

                <textarea
                  value={pick.report}
                  onChange={(e) => setPick(p.matchupId, { report: e.target.value })}
                  placeholder="Billy's take..."
                  rows={2}
                  className="mt-3 w-full resize-y rounded-xl border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 px-3 py-2 text-sm text-zinc-100 light:text-zinc-900 placeholder:text-zinc-600 light:placeholder:text-zinc-400 outline-none focus:border-zinc-700 light:focus:border-zinc-400"
                />
              </div>
            );
          })}
        </div>
      )}

      {err ? <div className="text-sm text-red-300 light:text-red-700">{err}</div> : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-10 rounded-full border border-zinc-800 light:border-zinc-200 bg-zinc-950/60 light:bg-zinc-50 px-4 text-sm font-medium text-zinc-300 light:text-zinc-700 transition hover:bg-zinc-900/50 light:hover:bg-zinc-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || leagueQuery.isLoading}
          className="h-10 rounded-full border border-red-800/60 light:border-red-400 bg-red-950/40 light:bg-red-100 px-5 text-sm font-semibold text-red-200 light:text-red-800 transition hover:bg-red-900/40 light:hover:bg-red-200 disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Save Report"}
        </button>
      </div>
    </form>
  );
}

export default function BillysReportPage() {
  const [entries, setEntries] = useState<ReportEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingEntry, setEditingEntry] = useState<ReportEntry | null>(null);

  // Every report starts collapsed — only ids the user has clicked open live here.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/billys-report", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok || json.error) throw new Error(json.error || `API error ${res.status}`);

        if (alive) setEntries(json.entries);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load Billy's Report.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => entries ?? [], [entries]);

  const nextDefaultWeek = useMemo(() => {
    const weeks = rows.map((e) => e.week).filter((w): w is number => typeof w === "number");
    return weeks.length ? Math.max(...weeks) + 1 : 1;
  }, [rows]);

  function closeForm() {
    setFormMode("closed");
    setEditingEntry(null);
  }

  function handleSaved(next: ReportEntry[]) {
    setEntries(next);
    closeForm();
  }

  async function handleDelete(entry: ReportEntry) {
    if (!window.confirm(`Delete "${entry.title}"? This can't be undone.`)) return;

    try {
      setDeletingId(entry.id);
      setDeleteErr(null);

      const res = await fetch(`/api/billys-report?id=${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || json.error) throw new Error(json.error || `API error ${res.status}`);

      setEntries(json.entries);
    } catch (e: any) {
      setDeleteErr(e?.message || "Failed to delete the report.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 light:bg-white text-zinc-100 light:text-zinc-900">
      <FloatingNav />

      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 md:pt-24">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Billy&apos;s Report</h1>
            <div className="mt-2 text-sm text-zinc-400 light:text-zinc-600">The weekly word, matchup by matchup</div>
          </div>

          {formMode === "closed" ? (
            <button
              type="button"
              onClick={() => setFormMode("add")}
              className="inline-flex h-11 md:h-10 items-center justify-center gap-1.5 rounded-full border border-red-800/60 light:border-red-400 bg-red-950/40 light:bg-red-100 px-6 text-sm font-semibold text-red-200 light:text-red-800 transition hover:bg-red-900/40 light:hover:bg-red-200"
            >
              <span className="text-base leading-none">+</span> Add Report
            </button>
          ) : null}
        </div>

        {formMode === "add" ? (
          <ReportForm mode="add" defaultWeek={nextDefaultWeek} onSaved={handleSaved} onCancel={closeForm} />
        ) : formMode === "edit" && editingEntry ? (
          editingEntry.week == null ? (
            <LegacyReportForm entry={editingEntry} onSaved={handleSaved} onCancel={closeForm} />
          ) : (
            <ReportForm
              mode="edit"
              initialEntry={editingEntry}
              defaultWeek={editingEntry.week}
              onSaved={handleSaved}
              onCancel={closeForm}
            />
          )
        ) : null}

        {deleteErr ? (
          <div className="mb-4 rounded-2xl border border-red-900/60 light:border-red-300 bg-zinc-950/60 light:bg-zinc-50 p-4 text-sm text-red-200 light:text-red-800 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)]">
            {deleteErr}
          </div>
        ) : null}

        {err ? (
          <div className="rounded-2xl border border-red-900/60 light:border-red-300 bg-zinc-950/60 light:bg-zinc-50 p-5 text-red-200 light:text-red-800 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="rounded-2xl border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50 p-8 text-center text-sm text-zinc-400 light:text-zinc-600 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)]">
            No reports yet. Add the first one.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((entry) => {
              const expanded = expandedIds.has(entry.id);

              return (
                <div
                  key={entry.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)]"
                >
                  <div
                    className={cx(
                      "flex items-center justify-between bg-zinc-900/40 light:bg-zinc-100 px-5 py-3",
                      expanded && "border-b border-zinc-800/70 light:border-zinc-200"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(entry.id)}
                      aria-expanded={expanded}
                      className="flex flex-1 items-center gap-2 rounded-lg py-1 text-left transition hover:text-zinc-50 light:hover:text-zinc-950"
                    >
                      <ChevronIcon expanded={expanded} />
                      <span className="text-sm font-semibold tracking-wide text-zinc-100 light:text-zinc-900">{entry.title}</span>
                      <span className="text-xs text-zinc-500 light:text-zinc-500">
                        ({entry.matchups.length} matchup{entry.matchups.length === 1 ? "" : "s"})
                      </span>
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-zinc-500 light:text-zinc-500">{fmtDate(entry.createdAt)}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntry(entry);
                          setFormMode("edit");
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 light:text-zinc-500 transition hover:bg-zinc-900/60 light:hover:bg-zinc-100 hover:text-zinc-200 light:hover:text-zinc-800"
                        aria-label={`Edit ${entry.title}`}
                        title={`Edit ${entry.title}`}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry)}
                        disabled={deletingId === entry.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 light:text-zinc-500 transition hover:bg-red-950/40 light:hover:bg-red-200 hover:text-red-300 light:hover:text-red-700 disabled:opacity-50"
                        aria-label={`Delete ${entry.title}`}
                        title={`Delete ${entry.title}`}
                      >
                        {deletingId === entry.id ? (
                          <span className="text-xs">…</span>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                              d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 .8 12.2A2 2 0 0 0 9.8 21h4.4a2 2 0 0 0 2-1.8L17 7"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div>
                      <table className="w-full table-fixed text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800/70 light:border-zinc-200 text-xs text-zinc-500 light:text-zinc-500">
                            <th className="w-2/5 px-5 py-2 font-medium">Matchup</th>
                            <th className="px-5 py-2 font-medium">Report</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.matchups.map((m) => {
                            const winner = winnerName(m);
                            return (
                              <tr key={m.id} className="border-b border-zinc-800/50 light:border-zinc-200 last:border-b-0">
                                <td className="whitespace-pre-wrap break-words px-5 py-3 align-top font-medium text-zinc-100 light:text-zinc-900">
                                  {m.matchup || "—"}
                                </td>
                                <td className="whitespace-pre-wrap break-words px-5 py-3 align-top leading-relaxed text-zinc-300 light:text-zinc-700">
                                  {winner ? (
                                    <div className="mb-1 break-words text-xs font-semibold uppercase tracking-wide text-red-300 light:text-red-700">
                                      Winner: {winner}
                                    </div>
                                  ) : null}
                                  {m.report || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
