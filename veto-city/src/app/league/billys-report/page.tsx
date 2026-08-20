"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";

type ReportEntry = {
  id: string;
  title: string;
  matchups: string;
  report: string;
  createdAt: string;
};

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return "";
  }
}

function AddEntryForm({
  onSaved,
  onCancel,
}: {
  onSaved: (entries: ReportEntry[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [matchups, setMatchups] = useState("");
  const [report, setReport] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !matchups.trim() || !report.trim()) {
      setErr("Title, matchups, and report are all required.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const res = await fetch("/api/billys-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, matchups, report }),
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
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Matchups
          </label>
          <textarea
            value={matchups}
            onChange={(e) => setMatchups(e.target.value)}
            placeholder={"Kingpin vs Allen Bhai\nI Maye Cook vs silver811\n..."}
            rows={6}
            className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Report
          </label>
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            placeholder="Billy's take on the week..."
            rows={6}
            className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700"
          />
        </div>
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
                  <div className="text-xs text-zinc-500">{fmtDate(entry.createdAt)}</div>
                </div>

                <div className="grid grid-cols-1 divide-y divide-zinc-800/60 md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="px-5 py-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Matchups
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                      {entry.matchups}
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Report
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                      {entry.report}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
