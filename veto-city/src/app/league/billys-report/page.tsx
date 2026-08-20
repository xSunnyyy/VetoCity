"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";

type MatchupRow = {
  id: string;
  matchup: string;
  report: string;
};

type ReportEntry = {
  id: string;
  title: string;
  matchups: MatchupRow[];
  createdAt: string;
};

const DEFAULT_ROW_COUNT = 6;

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return "";
  }
}

function blankRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({ key: `${Date.now()}-${i}-${Math.random()}`, matchup: "", report: "" }));
}

function AddEntryForm({
  onSaved,
  onCancel,
}: {
  onSaved: (entries: ReportEntry[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState(() => blankRows(DEFAULT_ROW_COUNT));
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      className="mb-6 space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
    >
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Week 1"
          className="w-full max-w-xs rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700"
        />
      </div>

      <div>
        <div className="mb-1.5 grid grid-cols-[1fr_1fr_36px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700"
              />
              <textarea
                value={r.report}
                onChange={(e) => updateRow(r.key, "report", e.target.value)}
                placeholder="Billy's take..."
                rows={1}
                className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700"
              />
              <button
                type="button"
                onClick={() => removeRow(r.key)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-900/60 hover:text-red-300"
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
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/60 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900/50"
        >
          <span className="text-base leading-none">+</span> Add Matchup
        </button>
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-10 rounded-full border border-zinc-800 bg-zinc-950/60 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900/50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-full border border-red-800/60 bg-red-950/40 px-5 text-sm font-semibold text-red-200 transition hover:bg-red-900/40 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Report"}
        </button>
      </div>
    </form>
  );
}

export default function BillysReportPage() {
  const [entries, setEntries] = useState<ReportEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

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
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 md:pt-24">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Billy&apos;s Report</h1>
            <div className="mt-2 text-sm text-zinc-400">The weekly word, matchup by matchup</div>
          </div>

          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex h-11 md:h-10 items-center justify-center gap-1.5 rounded-full border border-red-800/60 bg-red-950/40 px-6 text-sm font-semibold text-red-200 transition hover:bg-red-900/40"
            >
              <span className="text-base leading-none">+</span> Add Report
            </button>
          ) : null}
        </div>

        {showForm ? (
          <AddEntryForm
            onSaved={(next) => {
              setEntries(next);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : null}

        {deleteErr ? (
          <div className="mb-4 rounded-2xl border border-red-900/60 bg-zinc-950/60 p-4 text-sm text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            {deleteErr}
          </div>
        ) : null}

        {err ? (
          <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-950/60" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-8 text-center text-sm text-zinc-400 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            No reports yet. Add the first one.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((entry) => (
              <div
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
              >
                <div className="flex items-center justify-between border-b border-zinc-800/70 bg-zinc-900/40 px-5 py-3">
                  <div className="text-sm font-semibold tracking-wide text-zinc-100">{entry.title}</div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-zinc-500">{fmtDate(entry.createdAt)}</div>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry)}
                      disabled={deletingId === entry.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:bg-red-950/40 hover:text-red-300 disabled:opacity-50"
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

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800/70 text-xs text-zinc-500">
                        <th className="w-2/5 px-5 py-2 font-medium">Matchup</th>
                        <th className="px-5 py-2 font-medium">Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.matchups.map((m) => (
                        <tr key={m.id} className="border-b border-zinc-800/50 last:border-b-0">
                          <td className="whitespace-pre-wrap px-5 py-3 align-top font-medium text-zinc-100">
                            {m.matchup || "—"}
                          </td>
                          <td className="whitespace-pre-wrap px-5 py-3 align-top leading-relaxed text-zinc-300">
                            {m.report || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
