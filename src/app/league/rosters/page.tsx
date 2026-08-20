"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";
import { buildTeams } from "@/app/lib/league";

type PlayerMeta = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
};

type PlayerMap = Record<string, PlayerMeta>;

type LeagueBundle = {
  users: any[];
  rosters: any[];
  transactions: any[];
  txnWeek: number;
  fetchedAt: string;
  league?: any;
  error?: string;
};

function safeName(p: PlayerMeta | undefined, id: string) {
  if (!p) return id;
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || id;
}

function metaLine(p: PlayerMeta | undefined) {
  if (!p) return "";
  const bits = [p.position, p.team].filter(Boolean);
  return bits.join(" • ");
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function sleeperAvatarUrl(avatarId?: string | null) {
  if (!avatarId) return null;
  return `https://sleepercdn.com/avatars/${avatarId}`;
}

function playerHeadshotUrl(playerId: string) {
  return `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`;
}

function nflTeamLogoUrl(abbr?: string) {
  if (!abbr) return null;
  return `https://sleepercdn.com/images/team_logos/nfl/${abbr.toLowerCase()}.png`;
}

async function getPlayersMap(): Promise<PlayerMap> {
  const key = "vetocity_players_nfl_v1";
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as PlayerMap;
  } catch {
    // ignore
  }

  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  if (!res.ok) throw new Error(`Failed to load players map (${res.status})`);
  const data = (await res.json()) as PlayerMap;

  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }

  return data;
}

function PosPill({ pos }: { pos: string }) {
  const base =
    "w-11 shrink-0 rounded-none border px-2 py-1 text-[11px] font-semibold tracking-wide text-center";

  const color =
    pos === "QB"
      ? "border-violet-900/70 bg-violet-950/60 text-violet-200/90"
      : pos === "RB"
      ? "border-emerald-900/70 bg-emerald-950/60 text-emerald-200/90"
      : pos === "WR"
      ? "border-sky-900/70 bg-sky-950/60 text-sky-200/90"
      : pos === "TE"
      ? "border-amber-900/70 bg-amber-950/60 text-amber-200/90"
      : pos === "BN"
      ? "border-zinc-800 bg-zinc-950 text-zinc-400"
      : "border-zinc-800 bg-zinc-950 text-zinc-200/90";

  return <div className={`${base} ${color}`}>{pos}</div>;
}

function PlayerRow({
  pos,
  playerId,
  player,
}: {
  pos: string;
  playerId: string;
  player?: PlayerMeta;
}) {
  const name = safeName(player, playerId);
  const meta = metaLine(player);
  const logo = nflTeamLogoUrl(player?.team);

  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <PosPill pos={pos} />

      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-none border border-zinc-800 bg-zinc-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={playerHeadshotUrl(playerId)}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-zinc-100">{name}</div>
        <div className="mt-0.5 truncate text-xs text-zinc-400">{meta}</div>
      </div>

      {logo ? (
        <div className="h-6 w-6 shrink-0 opacity-90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={player?.team ?? ""} className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="h-6 w-6 shrink-0" />
      )}
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px w-full bg-zinc-800/70" />;
}

function BenchToggle({
  open,
  count,
  onClick,
}: {
  open: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 px-3 py-3 text-sm text-zinc-200 hover:bg-zinc-900/40"
    >
      <span aria-hidden>🪑</span>
      <span className="font-medium">
        Bench{" "}
        <span className="text-zinc-500">
          ({open ? "shown" : "minimized"} • {count})
        </span>
      </span>
    </button>
  );
}

export default function RostersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [bundle, setBundle] = useState<LeagueBundle | null>(null);
  const [players, setPlayers] = useState<PlayerMap | null>(null);
  const [openBench, setOpenBench] = useState<Record<number, boolean>>({});

  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/league", { cache: "no-store" });
        const data = (await res.json()) as LeagueBundle;

        if (!res.ok || (data as any).error) {
          throw new Error((data as any).error || `API error ${res.status}`);
        }

        const pm = await getPlayersMap();

        if (!alive) return;
        setBundle(data);
        setPlayers(pm);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load rosters.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const teamsData = useMemo(() => {
    if (!bundle) return [];

    const teams = buildTeams(bundle.users, bundle.rosters);

    return bundle.rosters
      .map((r: any) => {
        const t = teams.get(r.roster_id);

        const name = t?.name ?? `Team ${r.roster_id}`;

        // ✅ Option A: derive owner display + avatar from users via ownerId
        const ownerId = t?.ownerId;
        const user =
          ownerId != null ? bundle.users.find((u: any) => String(u?.user_id) === String(ownerId)) : null;

        const ownerName =
          safeStr(user?.metadata?.team_name).trim() ||
          safeStr(user?.display_name).trim() ||
          safeStr(user?.username).trim() ||
          "";

        const avatar = sleeperAvatarUrl(user?.avatar ?? null);

        const starters: string[] = Array.isArray(r.starters) ? r.starters : [];
        const allPlayers: string[] = Array.isArray(r.players) ? r.players : [];

        const starterSet = new Set(starters);
        const bench = allPlayers.filter((pid) => !starterSet.has(pid));

        const starterRows = starters.map((pid) => {
          const p = players ? players[pid] : undefined;
          const pos = p?.position || "FLEX";
          return { pid, pos, p };
        });

        const benchRows = bench.map((pid) => {
          const p = players ? players[pid] : undefined;
          const pos = p?.position || "BN";
          return { pid, pos, p };
        });

        const allNames = [...starterRows, ...benchRows].map((x) => safeName(x.p, x.pid)).join(" ");
        const searchBlob = `${name} ${ownerName} ${allNames}`.toLowerCase();

        return {
          rosterId: r.roster_id as number,
          name,
          ownerName,
          avatar,
          starterRows,
          benchRows,
          searchBlob,
        };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [bundle, players]);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teamsData;
    return teamsData.filter((t) => t.searchBlob.includes(q));
  }, [teamsData, query]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <FloatingNav />
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6">
            <div className="text-2xl font-semibold tracking-tight">Rosters</div>
            <div className="mt-1 text-sm text-zinc-400">Loading teams…</div>
          </div>

          <div className="rounded-none border border-zinc-800 bg-zinc-950 p-3">
            <div className="h-10 w-full rounded bg-zinc-900/30" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-none border border-zinc-800 bg-zinc-950 p-5">
                <div className="h-5 w-32 rounded bg-zinc-900/50" />
                <div className="mt-4 h-56 w-full rounded bg-zinc-900/30" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <FloatingNav />
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-none border border-red-900/60 bg-zinc-950 p-5 text-red-200">
            <div className="font-semibold">Rosters error</div>
            <div className="mt-2 text-sm opacity-90">{err}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto max-w-none px-4 py-10">
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight">Rosters</div>
        </div>

        <div className="mb-4 rounded-none border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium text-zinc-200">Search teams, owners, or players</div>

            <div className="flex w-full gap-2 sm:w-[420px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search… (ex: Lamar, Abbyyzz, Sacko)"
                className="w-full rounded-none border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  className="shrink-0 rounded-none border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {query ? (
            <div className="mt-2 text-xs text-zinc-500">
              Showing {filteredTeams.length} of {teamsData.length}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[1800px]">
            <div className="grid grid-cols-6 gap-4">
              {filteredTeams.map((t) => {
                const benchOpen = !!openBench[t.rosterId];

                return (
                  <section
                    key={t.rosterId}
                    className="overflow-hidden rounded-none border border-zinc-800 bg-zinc-950 shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
                  >
                    <div className="px-4 pt-4 text-center">
                      <div className="mx-auto flex items-center justify-center gap-2">
                        <div className="h-9 w-9 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                          {t.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.avatar}
                              alt={t.ownerName || t.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-zinc-100">{t.name}</div>
                          {t.ownerName ? (
                            <div className="mt-0.5 truncate text-[11px] text-zinc-400">{t.ownerName}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <SectionDivider />
                    </div>

                    <div className="divide-y divide-zinc-800/70">
                      {t.starterRows.map((row) => (
                        <PlayerRow key={row.pid} pos={row.pos} playerId={row.pid} player={row.p} />
                      ))}
                    </div>

                    <div className="mt-0">
                      <SectionDivider />
                      <BenchToggle
                        open={benchOpen}
                        count={t.benchRows.length}
                        onClick={() =>
                          setOpenBench((prev) => ({
                            ...prev,
                            [t.rosterId]: !prev[t.rosterId],
                          }))
                        }
                      />
                    </div>

                    {benchOpen ? (
                      <div className="border-t border-zinc-800/70 bg-zinc-950">
                        <div className="divide-y divide-zinc-800/70">
                          {t.benchRows.map((row) => (
                            <PlayerRow
                              key={row.pid}
                              pos={row.pos === "BN" ? "BN" : row.pos}
                              playerId={row.pid}
                              player={row.p}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        {filteredTeams.length === 0 ? (
          <div className="mt-6 rounded-none border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
            No results for <span className="font-semibold text-zinc-100">{query}</span>.
          </div>
        ) : null}
      </div>
    </main>
  );
}
