"use client";

import { useEffect, useMemo, useState } from "react";
import { buildTeams, formatPoints } from "../lib/league";

type CardKind =
  | "waivers"
  | "trades"
  | "power"
  | "motw"
  | "blowout"
  | "lucky";

type PlayerMeta = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
};

type PlayerMap = Record<string, PlayerMeta>;

type DraftPick = {
  season: string;
  round: number;
  roster_id: number;
  previous_owner_id: number;
  owner_id: number;
};

function scoreFmt(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1);
}

function Icon({ kind }: { kind: CardKind }) {
  const base =
    "h-9 w-9 rounded-none border border-zinc-800 bg-zinc-950 flex items-center justify-center";
  const glyph = "text-zinc-200";
  switch (kind) {
    case "waivers":
      return (
        <div className={base} aria-hidden>
          <svg className={glyph} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v6l4 2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 12a9 9 0 1 1-9-9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    case "trades":
      return (
        <div className={base} aria-hidden>
          <svg className={glyph} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 7h11l-2.5-2.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17 17H6l2.5 2.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    case "power":
      return (
        <div className={base} aria-hidden>
          <svg className={glyph} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M18 20v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      );
    case "motw":
      return (
        <div className={base} aria-hidden>
          <svg className={glyph} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path
              d="M7 4h10v6a5 5 0 0 1-10 0V4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    case "blowout":
      return (
        <div className={base} aria-hidden>
          <svg className={glyph} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    case "lucky":
      return (
        <div className={base} aria-hidden>
          <svg className={glyph} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
  }
}

function CardShell({
  kind,
  title,
  children,
}: {
  kind: CardKind;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-none border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 via-transparent to-transparent" />
      </div>

      <div className="relative flex items-start gap-3">
        <Icon kind={kind} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium tracking-wide text-zinc-400">
            {title.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="relative mt-4">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-zinc-900/70" />;
}

function TeamScoreBox({
  topTeam,
  topScore,
  bottomTeam,
  bottomScore,
}: {
  topTeam: string;
  topScore: number;
  bottomTeam: string;
  bottomScore: number;
}) {
  return (
    <div className="rounded-none border border-zinc-900/70 bg-zinc-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-200">{topTeam}</div>
        </div>
        <div className="text-lg font-semibold text-zinc-100">{scoreFmt(topScore)}</div>
      </div>

      <div className="my-3 h-px w-full bg-zinc-900/70" />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-200">{bottomTeam}</div>
        </div>
        <div className="text-lg font-semibold text-zinc-100">{scoreFmt(bottomScore)}</div>
      </div>
    </div>
  );
}

function txnTime(t: any): number {
  return (
    (typeof t.status_updated === "number" ? t.status_updated : 0) ||
    (typeof t.created === "number" ? t.created : 0) ||
    0
  );
}

function pickTopAdds(adds: Record<string, number> | undefined, max = 4) {
  if (!adds) return [];
  return Object.keys(adds).slice(0, max);
}

function collectPlayerIdsFromTxns(txns: any[]) {
  const set = new Set<string>();
  for (const t of txns) {
    if (t.adds) for (const pid of Object.keys(t.adds)) set.add(pid);
    if (t.drops) for (const pid of Object.keys(t.drops)) set.add(pid);
  }
  return [...set];
}

async function getPlayersMapIfNeeded(playerIds: string[]): Promise<PlayerMap> {
  const key = "vetocity_players_nfl_v1";
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as PlayerMap;
      const missing = playerIds.find((id) => !parsed[id]);
      if (!missing) return parsed;
    }
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

function playerName(players: PlayerMap | null, id: string) {
  if (!players) return id;
  const p = players[id];
  if (!p) return id;

  const name =
    p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || id;

  const suffix = [p.position, p.team].filter(Boolean).join(" · ");
  return suffix ? `${name} (${suffix})` : name;
}

function pickLabelForPick(p: DraftPick) {
  return `${p.season} R${p.round} Pick`;
}

type LeagueBundle = {
  users: any[];
  rosters: any[];
  transactions: any[];
  txnWeek: number;
  fetchedAt: string;
  error?: string;
};

export function DashboardCards() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [waiverRows, setWaiverRows] = useState<{ team: string; players: string[] }[]>([]);
  const [tradeRows, setTradeRows] = useState<
    { aTeam: string; bTeam: string; aGets: string[]; bGets: string[] }[]
  >([]);
  const [powerRows, setPowerRows] = useState<{ rank: number; team: string; note: string }[]>([]);

  // we’ll wire these up later when we decide “current week”
  const [motw] = useState<null | any>(null);
  const [blowout] = useState<null | any>(null);
  const [lucky] = useState<null | any>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/league", { cache: "no-store" });
        const data = (await res.json()) as LeagueBundle;

        if (!res.ok || (data as any).error) {
          throw new Error((data as any).error || `API error ${res.status}`);
        }

        const teams = buildTeams(data.users, data.rosters);

        const ids = collectPlayerIdsFromTxns(data.transactions);
        const playersMap = ids.length ? await getPlayersMapIfNeeded(ids) : null;

        const waivers = data.transactions
          .filter((t) => t.type === "waiver" || t.type === "free_agent")
          .sort((a, b) => txnTime(b) - txnTime(a))
          .slice(0, 5)
          .map((t) => {
            const rosterId =
              (t.adds && Object.values(t.adds)[0]) ??
              (t.roster_ids && t.roster_ids[0]) ??
              -1;

            const teamName =
              rosterId !== -1 ? teams.get(rosterId)?.name ?? `Team ${rosterId}` : "Unknown";

            const added = pickTopAdds(t.adds, 4).map((pid) => playerName(playersMap, pid));
            return { team: teamName, players: added.length ? added : ["(No adds listed)"] };
          });

        const trades = data.transactions
          .filter((t) => t.type === "trade")
          .sort((a, b) => txnTime(b) - txnTime(a))
          .slice(0, 5)
          .map((t) => {
            const rosterIds = (t.roster_ids ?? []).slice(0, 2);
            const aRid = rosterIds[0] ?? -1;
            const bRid = rosterIds[1] ?? -1;

            const aTeam = aRid !== -1 ? teams.get(aRid)?.name ?? `Team ${aRid}` : "Team A";
            const bTeam = bRid !== -1 ? teams.get(bRid)?.name ?? `Team ${bRid}` : "Team B";

            const aGets: string[] = [];
            const bGets: string[] = [];

            if (t.adds) {
              for (const [pid, rid] of Object.entries(t.adds)) {
                if (rid === aRid) aGets.push(playerName(playersMap, pid));
                else if (rid === bRid) bGets.push(playerName(playersMap, pid));
              }
            }

            const picks = (t.draft_picks ?? []) as DraftPick[];
            for (const p of picks) {
              if (p.owner_id === aRid) aGets.push(pickLabelForPick(p));
              else if (p.owner_id === bRid) bGets.push(pickLabelForPick(p));
            }

            return {
              aTeam,
              bTeam,
              aGets: aGets.length ? aGets.slice(0, 6) : ["—"],
              bGets: bGets.length ? bGets.slice(0, 6) : ["—"],
            };
          });

        const power = data.rosters
          .map((r: any) => {
            const team = teams.get(r.roster_id)?.name ?? `Team ${r.roster_id}`;
            const wins = r.settings?.wins ?? 0;
            const losses = r.settings?.losses ?? 0;

            const pf = (r.settings?.fpts ?? 0) + ((r.settings?.fpts_decimal ?? 0) / 100);
            const pa =
              (r.settings?.fpts_against ?? 0) + ((r.settings?.fpts_against_decimal ?? 0) / 100);

            const score = wins * 2 + pf / 100 - pa / 120;
            return { team, wins, losses, pf, score };
          })
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 5)
          .map((t: any, i: number) => ({
            rank: i + 1,
            team: t.team,
            note: `${t.wins}-${t.losses} • PF ${formatPoints(t.pf)}`,
          }));

        if (!alive) return;

        setWaiverRows(waivers);
        setTradeRows(trades);
        setPowerRows(power);
      } catch (e: any) {
        if (alive) setError(e?.message || "Failed to load data.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const content = useMemo(() => {
    if (error) {
      return (
        <div className="rounded-none border border-red-900/60 bg-zinc-950 p-5 text-red-200">
          <div className="font-semibold">Load error</div>
          <div className="mt-2 text-sm opacity-90">{error}</div>
        </div>
      );
    }

    if (loading) {
      return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-none border border-zinc-800 bg-zinc-950 p-5">
              <div className="h-4 w-32 rounded bg-zinc-900/50" />
              <div className="mt-4 h-24 w-full rounded bg-zinc-900/30" />
            </div>
          ))}
        </section>
      );
    }

    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardShell kind="waivers" title="Waiver Wire">
          {waiverRows.length ? (
            <div className="rounded-none border border-zinc-900/70 bg-zinc-950">
              {waiverRows.map((r, idx) => (
                <div key={idx}>
                  <div className="px-3 py-3">
                    <div className="truncate text-sm font-semibold text-zinc-200">{r.team}</div>
                    <div className="mt-2 text-xs text-zinc-400">{r.players.join(" • ")}</div>
                  </div>
                  {idx !== waiverRows.length - 1 ? <Divider /> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">No waiver activity found.</div>
          )}
        </CardShell>

        <CardShell kind="trades" title="Trades">
          {tradeRows.length ? (
            <div className="space-y-3">
              {tradeRows.map((t, idx) => (
                <div key={idx} className="rounded-none border border-zinc-900/70 bg-zinc-950 p-3">
                  <div className="text-sm font-semibold text-zinc-200">
                    {t.aTeam} <span className="text-zinc-500">↔</span> {t.bTeam}
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-zinc-400">
                    <div>
                      <span className="font-medium text-zinc-300">{t.aTeam}</span> gets:{" "}
                      {t.aGets.join(" • ")}
                    </div>
                    <div>
                      <span className="font-medium text-zinc-300">{t.bTeam}</span> gets:{" "}
                      {t.bGets.join(" • ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">No trades found.</div>
          )}
        </CardShell>

        <CardShell kind="power" title="Power Rankings">
          {powerRows.length ? (
            <div className="rounded-none border border-zinc-900/70 bg-zinc-950">
              {powerRows.map((r, idx) => (
                <div key={r.rank}>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-none border border-zinc-800 bg-zinc-950 text-xs font-semibold text-zinc-200">
                      {r.rank}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-200">{r.team}</div>
                      <div className="mt-1 text-xs text-zinc-400">{r.note}</div>
                    </div>
                  </div>
                  {idx !== powerRows.length - 1 ? <Divider /> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">No data yet.</div>
          )}
        </CardShell>

        <CardShell kind="motw" title="Matchup of the Week">
          <div className="text-sm text-zinc-400">
            We’ll wire this up once we finalize “current week” logic.
          </div>
        </CardShell>

        <CardShell kind="blowout" title="Biggest Blowout">
          <div className="text-sm text-zinc-400">
            We’ll wire this up once we finalize “current week” logic.
          </div>
        </CardShell>

        <CardShell kind="lucky" title="Luckiest Win">
          <div className="text-sm text-zinc-400">
            We’ll wire this up once we finalize “current week” logic.
          </div>
        </CardShell>
      </section>
    );
  }, [error, loading, powerRows, tradeRows, waiverRows]);

  return <div>{content}</div>;
}
