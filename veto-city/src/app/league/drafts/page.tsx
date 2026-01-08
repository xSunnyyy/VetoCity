"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";
import { buildTeams } from "@/app/lib/league";

type DraftBundle = {
  league: any;
  users: any[];
  rosters: any[];
  draft: any | null;
  picks: any[];
  draftsAll?: Array<{
    league: any;
    users: any[];
    rosters: any[];
    draft: any | null;
    picks: any[];
  }>;
  fetchedAt: string;
  error?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function avatarUrl(avatar?: string | null) {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/${avatar}`;
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function playerLabelFromPick(pick: any) {
  const meta = pick?.metadata || {};
  const first = safeStr(meta?.first_name).trim();
  const last = safeStr(meta?.last_name).trim();
  const full = safeStr(meta?.full_name).trim();

  const name =
    first || last
      ? `${first} ${last}`.trim()
      : full || safeStr(pick?.player_id) || "—";

  const pos = safeStr(meta?.position).trim().toUpperCase();
  const nflTeam = safeStr(meta?.team).trim().toUpperCase();
  const sub = nflTeam ? `(${nflTeam})` : "";

  return { name, pos, sub, nflTeam };
}

// Snake pick number by round + slotIndex (1..slots)
function pickNoFor(round: number, slotIndex: number, slots: number, type: string) {
  const isSnake = String(type || "").toLowerCase() === "snake";
  const base = (round - 1) * slots;

  if (!isSnake) return base + slotIndex;

  const isEvenRound = round % 2 === 0;
  return isEvenRound ? base + (slots - slotIndex + 1) : base + slotIndex;
}

function posFill(pos?: string) {
  switch ((pos || "").toUpperCase()) {
    case "QB":
      return "bg-fuchsia-500/18";
    case "RB":
      return "bg-emerald-500/18";
    case "WR":
      return "bg-sky-500/18";
    case "TE":
      return "bg-amber-500/18";
    case "K":
      return "bg-zinc-400/12";
    case "DEF":
    case "DST":
      return "bg-indigo-500/18";
    default:
      return "bg-zinc-950/10";
  }
}

function posText(pos?: string) {
  switch ((pos || "").toUpperCase()) {
    case "QB":
      return "text-fuchsia-100";
    case "RB":
      return "text-emerald-100";
    case "WR":
      return "text-sky-100";
    case "TE":
      return "text-amber-100";
    case "K":
      return "text-zinc-100";
    case "DEF":
    case "DST":
      return "text-indigo-100";
    default:
      return "text-zinc-100";
  }
}

function LegendChip({ label, pos }: { label: string; pos: string }) {
  return (
    <span
      className={cx(
        "rounded-full border px-2 py-1 text-xs font-semibold",
        "border-zinc-800/70 text-zinc-200",
        posFill(pos)
      )}
    >
      {label}
    </span>
  );
}

export default function DraftboardPage() {
  const [bundle, setBundle] = useState<DraftBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // which season index are we viewing (0 = newest)
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/draftboard", { cache: "no-store" });
        const data = (await res.json()) as DraftBundle;

        if (!res.ok || (data as any).error) {
          throw new Error((data as any).error || `API error ${res.status}`);
        }

        if (!alive) return;
        setBundle(data);
        setIdx(0); // default newest
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load draftboard.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const draftsAll = useMemo(() => {
    const arr = bundle?.draftsAll;
    if (Array.isArray(arr) && arr.length) return arr;

    // fallback for older payloads
    if (bundle?.league) {
      return [
        {
          league: bundle.league,
          users: bundle.users || [],
          rosters: bundle.rosters || [],
          draft: bundle.draft || null,
          picks: bundle.picks || [],
        },
      ];
    }
    return [];
  }, [bundle]);

  const active = useMemo(() => {
    const safeIndex = Math.max(0, Math.min(idx, Math.max(0, draftsAll.length - 1)));
    return draftsAll[safeIndex] ?? null;
  }, [draftsAll, idx]);

  const teams = useMemo(() => {
    if (!active) return new Map<number, any>();
    return buildTeams(active.users, active.rosters);
  }, [active]);

  const draftMeta = useMemo(() => {
    const d = active?.draft;
    const s = d?.settings || {};
    const leagueSettings = active?.league?.settings || {};

    const rounds = Number(s.rounds ?? 0) || Number(leagueSettings.draft_rounds ?? 0) || 0;

    const slots =
      Number(s.slots ?? 0) ||
      Number(leagueSettings.num_teams ?? 0) ||
      Number(active?.league?.total_rosters ?? 0) ||
      0;

    const type = String(d?.type || "").toLowerCase();

    // draft_order keys are typically user_id; map to roster_id
    const userIdToRosterId = new Map<string, number>();
    for (const r of active?.rosters || []) {
      const rid = Number(r?.roster_id);
      const uid = safeStr(r?.owner_id);
      if (uid && Number.isFinite(rid)) userIdToRosterId.set(uid, rid);
    }

    const draftOrder = (d?.draft_order || {}) as Record<string, number>;
    const slotToRoster = new Map<number, number>();
    for (const [key, slotVal] of Object.entries(draftOrder)) {
      const slot = Number(slotVal);
      if (!Number.isFinite(slot)) continue;

      const rosterIdFromUser = userIdToRosterId.get(key);
      if (rosterIdFromUser != null) {
        slotToRoster.set(slot, rosterIdFromUser);
        continue;
      }

      const maybeRid = Number(key);
      if (Number.isFinite(maybeRid)) slotToRoster.set(slot, maybeRid);
    }

    return { rounds, slots, type, slotToRoster };
  }, [active]);

  const picksByNo = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of active?.picks || []) {
      const no = Number(p?.pick_no);
      if (Number.isFinite(no)) map.set(no, p);
    }
    return map;
  }, [active]);

  const board = useMemo(() => {
    const d = active?.draft;
    const { rounds, slots, type, slotToRoster } = draftMeta;
    if (!active || !d || !rounds || !slots) return null;

    const orderSlots = Array.from({ length: slots }, (_, i) => i + 1);

    const columns = orderSlots.map((slot) => {
      const rid = slotToRoster.get(slot) ?? null;
      const team = rid != null ? teams.get(rid) : null;
      return {
        slot,
        rosterId: rid,
        teamName: team?.name ?? (rid != null ? `Team ${rid}` : "—"),
        teamAvatar: avatarUrl(team?.avatar ?? null),
      };
    });

    const query = q.trim().toLowerCase();

    const roundsRows = Array.from({ length: rounds }, (_, i) => {
      const round = i + 1;

      const cells = columns.map((col) => {
        const pickNo = pickNoFor(round, col.slot, slots, type);
        const pick = picksByNo.get(pickNo);
        const isPicked = Boolean(pick);

        const { name, pos, sub } = isPicked
          ? playerLabelFromPick(pick)
          : { name: "—", pos: "", sub: "" };

        const pickLabel = `${round}.${String(col.slot).padStart(2, "0")}`;

        const haystack = `${col.teamName} ${name} ${pos} ${sub} ${pickLabel} #${pickNo}`.toLowerCase();
        const isMatch = !query || haystack.includes(query);

        return {
          pickNo,
          round,
          slot: col.slot,
          pickLabel,
          isPicked,
          playerName: isPicked ? name : "",
          playerPos: isPicked ? pos : "",
          playerSub: isPicked ? sub : "",
          isMatch,
        };
      });

      return { round, cells };
    });

    return { columns, roundsRows, rounds, slots, type };
  }, [active, draftMeta, teams, picksByNo, q]);

  const missingSettings = !!active?.draft && (!draftMeta.rounds || !draftMeta.slots);

  // sizing (same as your “perfect” version)
  const gridCols = board?.columns.length ?? 0;
  const cellW = 150;
  const leftW = 36;
  const gapPx = 2;

  const gridExactWidth =
    leftW + (gridCols > 0 ? gridCols * cellW : 0) + (gridCols > 0 ? (gridCols - 1) * gapPx : 0);

  const headerH = "h-10";
  const cellH = "h-[56px]";

  const seasonLabel = active?.league?.season ? String(active.league.season) : "—";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto w-full max-w-[2600px] px-0 pb-12 pt-20 md:pt-24">
        <div className="mx-auto mb-6 flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/* ✅ title row now has selector inline */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Draftboard</h1>

              <select
                value={idx}
                onChange={(e) => setIdx(Number(e.target.value))}
                className="h-11 md:h-9 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 text-sm font-medium text-zinc-200 outline-none transition hover:bg-zinc-900/40 focus:border-zinc-700"
              >
                {draftsAll.map((d, i) => {
                  const season = d?.league?.season ? String(d.league.season) : "—";
                  const name = d?.league?.name ? String(d.league.name) : "League";
                  return (
                    <option key={`${season}-${i}`} value={i}>
                      {season} • {name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* search stays centered vertically in this row */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search team or player…"
              className="h-11 md:h-10 w-full sm:w-[360px] rounded-full border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 hover:bg-zinc-900/40 focus:border-zinc-700"
            />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4">
          {err ? (
            <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
              <div className="text-sm font-semibold">Load error</div>
              <div className="mt-2 text-sm opacity-90">{err}</div>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="mx-auto max-w-6xl px-4">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
              <div className="h-4 w-48 rounded bg-zinc-900/50" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-zinc-900/30" />
                ))}
              </div>
            </div>
          </div>
        ) : !active?.draft ? (
          <div className="mx-auto max-w-6xl px-4 text-sm text-zinc-400">
            No draft found for this season.
          </div>
        ) : missingSettings ? (
          <div className="mx-auto max-w-6xl px-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 text-zinc-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
              <div className="text-sm font-semibold">Draft settings missing</div>
              <div className="mt-2 text-sm text-zinc-400">
                Draft payload didn’t include rounds/slots, and league fallback is empty too.
              </div>
            </div>
          </div>
        ) : !board ? (
          <div className="mx-auto max-w-6xl px-4 text-sm text-zinc-400">
            Draftboard data not ready.
          </div>
        ) : (
          <div className="w-full overflow-x-auto px-2 md:flex md:justify-center">
            <div className="inline-block min-w-full md:min-w-0">
              <div
                className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur"
                style={{ width: gridExactWidth + 24 }}
              >
                <div className="flex flex-col gap-3 border-b border-zinc-800/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-semibold text-zinc-100">
                    Draft Board{" "}
                    <span className="text-zinc-500 font-normal">
                      • {board.rounds}R • {board.slots}T •{" "}
                      {board.rounds * board.slots}P
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <LegendChip label="QB" pos="QB" />
                    <LegendChip label="RB" pos="RB" />
                    <LegendChip label="WR" pos="WR" />
                    <LegendChip label="TE" pos="TE" />
                    <LegendChip label="K" pos="K" />
                    <LegendChip label="DEF" pos="DEF" />
                  </div>
                </div>

                <div className="p-3">
                  <div
                    className="grid"
                    style={{
                      gap: `${gapPx}px`,
                      gridTemplateColumns: `${leftW}px repeat(${board.columns.length}, ${cellW}px)`,
                    }}
                  >
                    <div className="sticky left-0 z-10 bg-zinc-950/60 backdrop-blur">
                      <div
                        className={cx(
                          headerH,
                          "flex items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-950/40 text-[10px] font-semibold text-zinc-400"
                        )}
                      >
                        R
                      </div>
                    </div>

                    {board.columns.map((c) => (
                      <div key={c.slot}>
                        <div
                          className={cx(
                            headerH,
                            "rounded-md border border-zinc-800/70 bg-zinc-950/40"
                          )}
                        >
                          <div className="flex h-full items-center gap-2 px-2">
                            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70">
                              {c.teamAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.teamAvatar}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[11px] font-semibold text-zinc-200">
                                {c.teamName}
                              </div>
                              <div className="truncate text-[10px] text-zinc-500">
                                Slot {c.slot}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2">
                    {board.roundsRows.map((row) => (
                      <div
                        key={row.round}
                        className="grid"
                        style={{
                          gap: `${gapPx}px`,
                          gridTemplateColumns: `${leftW}px repeat(${board.columns.length}, ${cellW}px)`,
                          marginBottom: `${gapPx}px`,
                        }}
                      >
                        <div className="sticky left-0 z-10 bg-zinc-950/60 backdrop-blur">
                          <div
                            className={cx(
                              cellH,
                              "flex items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-950/40 text-[11px] font-semibold text-zinc-400"
                            )}
                          >
                            {row.round}
                          </div>
                        </div>

                        {row.cells.map((cell) => {
                          const fill = cell.isPicked ? posFill(cell.playerPos) : "bg-zinc-950/10";
                          const text = cell.isPicked ? posText(cell.playerPos) : "text-zinc-100";
                          const dim = q.trim() && !cell.isMatch ? "opacity-25" : "opacity-100";

                          return (
                            <div key={cell.pickNo}>
                              <div
                                className={cx(
                                  cellH,
                                  "rounded-md border border-zinc-800/60",
                                  fill,
                                  text,
                                  "transition",
                                  cell.isPicked ? "" : "opacity-70",
                                  dim
                                )}
                                title={`#${cell.pickNo}`}
                              >
                                <div className="h-full px-2 py-1.5">
                                  <div className="text-[10px] font-semibold text-zinc-100/70">
                                    {cell.pickLabel}
                                  </div>

                                  {cell.isPicked ? (
                                    <div className="mt-1">
                                      <div className="truncate text-[12px] font-semibold leading-tight">
                                        {cell.playerName}{" "}
                                        <span className="font-medium text-zinc-100/70">
                                          {cell.playerSub}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-3 text-[11px] text-zinc-100/40">—</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-center text-xs text-zinc-600">
                Showing season {seasonLabel} • {active?.league?.league_id}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
