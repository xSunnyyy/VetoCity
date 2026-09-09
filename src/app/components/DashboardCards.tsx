"use client";

import { useMemo, useState } from "react";
import { buildTeams, formatPoints } from "../lib/league";
import { useLeagueDataQuery } from "@/app/hooks/useLeagueDataQuery";
import { usePlayersQuery, type PlayerMap } from "@/app/hooks/usePlayersQuery";

type CardKind = "waivers" | "trades" | "power" | "motw" | "blowout" | "lucky";

type DraftPick = {
  season: string;
  round: number;
  roster_id: number;
  previous_owner_id: number;
  owner_id: number;
};

type WeeklyCard = {
  topRosterId: number;
  topTeam: string;
  topScore: number;
  bottomRosterId: number;
  bottomTeam: string;
  bottomScore: number;
  note?: string;
};

type MatchupRow = {
  roster_id: number;
  matchup_id: number | null;
  points: number;
};

const DEFAULT_MAX_WEEKS = 18;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function scoreFmt(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/** ---------- Avatar helpers ---------- */

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

function TeamAvatar({
  team,
  avatarUrl,
  size = 28,
}: {
  team: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const s = `${size}px`;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      style={{ width: s, height: s }}
      title={team}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={team} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-zinc-200">
          {initials(team)}
        </div>
      )}
    </div>
  );
}

/** ---------- UI primitives ---------- */

function Icon({ kind }: { kind: CardKind }) {
  const base =
    "h-10 w-10 rounded-xl border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex items-center justify-center";
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
  subtitle,
  children,
}: {
  kind: CardKind;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 via-transparent to-transparent" />
      </div>

      <div className="relative flex items-start gap-3 px-5 pt-5">
        <Icon kind={kind} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-wide text-zinc-100">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
        </div>
      </div>

      <div className="relative px-5 pb-5 pt-4">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-zinc-800/70" />;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
      {children}
    </span>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((s, i) => (
        <span
          key={`${s}-${i}`}
          className="max-w-full truncate rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[11px] text-zinc-300"
          title={s}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function TeamRow({
  team,
  rosterId,
  score,
  avatarUrl,
}: {
  team: string;
  rosterId: number;
  score: number;
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-2">
        <TeamAvatar team={team} avatarUrl={avatarUrl} size={28} />
        <div className="truncate text-sm font-semibold text-zinc-200">{team}</div>
      </div>
      <div className="text-lg font-semibold text-zinc-100">{scoreFmt(score)}</div>
    </div>
  );
}

function TeamScoreBox({
  topRosterId,
  topTeam,
  topScore,
  bottomRosterId,
  bottomTeam,
  bottomScore,
  note,
  getAvatarUrl,
}: WeeklyCard & { getAvatarUrl: (rid: number) => string | null }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <TeamRow
        team={topTeam}
        rosterId={topRosterId}
        score={topScore}
        avatarUrl={getAvatarUrl(topRosterId)}
      />

      <div className="my-3 h-px w-full bg-zinc-800/70" />

      <TeamRow
        team={bottomTeam}
        rosterId={bottomRosterId}
        score={bottomScore}
        avatarUrl={getAvatarUrl(bottomRosterId)}
      />

      {note ? <div className="mt-3 text-xs text-zinc-500">{note}</div> : null}
    </div>
  );
}

/** ---------- Sleeper helpers ---------- */

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

function playerName(players: PlayerMap | null, id: string) {
  if (!players) return id;
  const p = players[id];
  if (!p) return id;

  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || id;
  const suffix = [p.position, p.team].filter(Boolean).join(" · ");
  return suffix ? `${name} (${suffix})` : name;
}

function pickLabelForPick(p: DraftPick) {
  return `${p.season} R${p.round} Pick`;
}

/** ---------- Weekly cards ---------- */

function computeWeeklyCards(matchups: MatchupRow[], teams: Map<number, any>) {
  const byMatchup = new Map<number, MatchupRow[]>();
  for (const m of matchups || []) {
    if (typeof m?.matchup_id !== "number") continue;
    const arr = byMatchup.get(m.matchup_id) ?? [];
    arr.push(m);
    byMatchup.set(m.matchup_id, arr);
  }

  const pairs = [...byMatchup.values()]
    .map((arr) => arr.filter((x) => typeof x?.points === "number"))
    .filter((arr) => arr.length >= 2)
    .map((arr) => {
      const sorted = [...arr].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
      const a = sorted[0];
      const b = sorted[1];

      const aName = teams.get(a.roster_id)?.name ?? `Team ${a.roster_id}`;
      const bName = teams.get(b.roster_id)?.name ?? `Team ${b.roster_id}`;

      const aScore = a.points ?? 0;
      const bScore = b.points ?? 0;

      return {
        aRid: a.roster_id,
        bRid: b.roster_id,
        aName,
        aScore,
        bName,
        bScore,
        total: aScore + bScore,
        diff: Math.abs(aScore - bScore),
      };
    });

  if (!pairs.length) {
    return { motw: null as WeeklyCard | null, blowout: null as WeeklyCard | null, lucky: null as WeeklyCard | null };
  }

  const motwPick = [...pairs].sort((x, y) => y.total - x.total)[0];
  const blowoutPick = [...pairs].sort((x, y) => y.diff - x.diff)[0];
  const luckyPick = [...pairs].sort((x, y) => x.diff - y.diff)[0];

  const motw: WeeklyCard = {
    topRosterId: motwPick.aRid,
    topTeam: motwPick.aName,
    topScore: motwPick.aScore,
    bottomRosterId: motwPick.bRid,
    bottomTeam: motwPick.bName,
    bottomScore: motwPick.bScore,
    note: `Total: ${scoreFmt(motwPick.total)}`,
  };

  const blowWinner =
    blowoutPick.aScore >= blowoutPick.bScore
      ? { rid: blowoutPick.aRid, name: blowoutPick.aName, score: blowoutPick.aScore }
      : { rid: blowoutPick.bRid, name: blowoutPick.bName, score: blowoutPick.bScore };

  const blowLoser =
    blowoutPick.aScore >= blowoutPick.bScore
      ? { rid: blowoutPick.bRid, name: blowoutPick.bName, score: blowoutPick.bScore }
      : { rid: blowoutPick.aRid, name: blowoutPick.aName, score: blowoutPick.aScore };

  const blowout: WeeklyCard = {
    topRosterId: blowWinner.rid,
    topTeam: blowWinner.name,
    topScore: blowWinner.score,
    bottomRosterId: blowLoser.rid,
    bottomTeam: blowLoser.name,
    bottomScore: blowLoser.score,
    note: `Margin: ${scoreFmt(blowoutPick.diff)}`,
  };

  const luckyWinner =
    luckyPick.aScore >= luckyPick.bScore
      ? { rid: luckyPick.aRid, name: luckyPick.aName, score: luckyPick.aScore }
      : { rid: luckyPick.bRid, name: luckyPick.bName, score: luckyPick.bScore };

  const luckyLoser =
    luckyPick.aScore >= luckyPick.bScore
      ? { rid: luckyPick.bRid, name: luckyPick.bName, score: luckyPick.bScore }
      : { rid: luckyPick.aRid, name: luckyPick.aName, score: luckyPick.aScore };

  const lucky: WeeklyCard = {
    topRosterId: luckyWinner.rid,
    topTeam: luckyWinner.name,
    topScore: luckyWinner.score,
    bottomRosterId: luckyLoser.rid,
    bottomTeam: luckyLoser.name,
    bottomScore: luckyLoser.score,
    note: `Margin: ${scoreFmt(luckyPick.diff)}`,
  };

  return { motw, blowout, lucky };
}

/** ---------- Component ---------- */

export function DashboardCards() {
  // selector week
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // React Query gives this a shared cache (see QueryProvider): switching to
  // a week already fetched this session, or coming back to Movement after
  // visiting another tab, renders instantly instead of re-running the whole
  // fetch pipeline. useLeagueDataQuery's placeholderData keeps the previous
  // week's data on screen while a new week loads in the background, so only
  // the week-specific cards (motw/blowout/lucky) need their own loading
  // state — waivers/trades/power rankings are season-to-date and identical
  // across weeks, so there's nothing to re-derive from a fresh fetch there.
  const leagueQuery = useLeagueDataQuery({ week: selectedWeek });
  const playersQuery = usePlayersQuery();

  const data = leagueQuery.data;
  const players = playersQuery.data ?? null;

  const loading = leagueQuery.isLoading;
  const weeklyLoading = leagueQuery.isFetching && !leagueQuery.isLoading;
  const error =
    (leagueQuery.error instanceof Error && leagueQuery.error.message) ||
    (playersQuery.error instanceof Error && playersQuery.error.message) ||
    null;

  const currentWeek = data ? selectedWeek : null;
  const maxWeek = Math.max(DEFAULT_MAX_WEEKS, data?.maxWeek ?? 0);

  const teamsMap = useMemo(() => {
    if (!data) return new Map<number, any>();
    return buildTeams(data.users, data.rosters);
  }, [data]);

  const avatarByRoster = useMemo(() => {
    const avMap: Record<number, string | null> = {};
    if (!data) return avMap;

    const userById = new Map<string, any>();
    for (const u of data.users || []) if (u?.user_id) userById.set(String(u.user_id), u);

    for (const r of data.rosters || []) {
      const rid = r?.roster_id;
      const ownerId = r?.owner_id;
      const u = ownerId ? userById.get(String(ownerId)) : null;
      const url = sleeperAvatarThumb(u?.avatar ?? null);
      if (typeof rid === "number") avMap[rid] = url;
    }
    return avMap;
  }, [data]);

  const waiverRows = useMemo(() => {
    if (!data) return [];

    return (data.transactions || [])
      .filter((t: any) => t.type === "waiver" || t.type === "free_agent")
      .sort((a: any, b: any) => txnTime(b) - txnTime(a))
      .slice(0, 5)
      .map((t: any) => {
        const rosterId =
          (t.adds && Object.values(t.adds)[0]) ?? (t.roster_ids && t.roster_ids[0]) ?? -1;

        const teamName = rosterId !== -1 ? teamsMap.get(rosterId)?.name ?? `Team ${rosterId}` : "Unknown";
        const added = pickTopAdds(t.adds, 4).map((pid) => playerName(players, pid));
        return { rosterId, team: teamName, players: added.length ? added : ["(No adds listed)"] };
      });
  }, [data, teamsMap, players]);

  const tradeRows = useMemo(() => {
    if (!data) return [];

    return (data.transactions || [])
      .filter((t: any) => t.type === "trade")
      .sort((a: any, b: any) => txnTime(b) - txnTime(a))
      .slice(0, 2)
      .map((t: any) => {
        const rosterIds = (t.roster_ids ?? []).slice(0, 2);
        const aRid = rosterIds[0] ?? -1;
        const bRid = rosterIds[1] ?? -1;

        const aTeam = aRid !== -1 ? teamsMap.get(aRid)?.name ?? `Team ${aRid}` : "Team A";
        const bTeam = bRid !== -1 ? teamsMap.get(bRid)?.name ?? `Team ${bRid}` : "Team B";

        const aGets: string[] = [];
        const bGets: string[] = [];

        if (t.adds) {
          for (const [pid, rid] of Object.entries(t.adds)) {
            if (rid === aRid) aGets.push(playerName(players, pid));
            else if (rid === bRid) bGets.push(playerName(players, pid));
          }
        }

        const picks = (t.draft_picks ?? []) as DraftPick[];
        for (const p of picks) {
          if (p.owner_id === aRid) aGets.push(pickLabelForPick(p));
          else if (p.owner_id === bRid) bGets.push(pickLabelForPick(p));
        }

        return {
          aRid,
          bRid,
          aTeam,
          bTeam,
          aGets: aGets.length ? aGets.slice(0, 6) : ["—"],
          bGets: bGets.length ? bGets.slice(0, 6) : ["—"],
        };
      });
  }, [data, teamsMap, players]);

  const powerRows = useMemo(() => {
    if (!data) return [];

    return (data.rosters || [])
      .map((r: any) => {
        const rosterId = r.roster_id;
        const team = teamsMap.get(rosterId)?.name ?? `Team ${rosterId}`;
        const wins = r.settings?.wins ?? 0;
        const losses = r.settings?.losses ?? 0;

        const pf = (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100;
        const pa = (r.settings?.fpts_against ?? 0) + (r.settings?.fpts_against_decimal ?? 0) / 100;

        const score = wins * 2 + pf / 100 - pa / 120;
        return { rosterId, team, wins, losses, pf, score };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5)
      .map((t: any, i: number) => ({
        rank: i + 1,
        rosterId: t.rosterId,
        team: t.team,
        note: `${t.wins}-${t.losses} • PF ${formatPoints(t.pf)}`,
      }));
  }, [data, teamsMap]);

  const { motw, blowout, lucky } = useMemo(() => {
    if (!data) return { motw: null, blowout: null, lucky: null };
    return computeWeeklyCards(data.matchups || [], teamsMap);
  }, [data, teamsMap]);

  const content = useMemo(() => {
    if (error) {
      return (
        <div className="rounded-2xl border border-red-900/60 bg-zinc-950/60 p-5 text-red-200 shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
          <div className="text-sm font-semibold">Load error</div>
          <div className="mt-2 text-sm opacity-90">{error}</div>
        </div>
      );
    }

    if (loading) {
      return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)]"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl border border-zinc-800/80 bg-zinc-950/60" />
                <div className="h-4 w-40 rounded bg-zinc-900/50" />
              </div>
              <div className="mt-5 h-24 w-full rounded-xl bg-zinc-900/30" />
            </div>
          ))}
        </section>
      );
    }

    const wk = currentWeek ? `Week ${currentWeek}` : "Latest week";
    const getAvatarUrl = (rid: number) => avatarByRoster[rid] ?? null;

    return (
      <div className="space-y-4">
        {/* Row 1 */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardShell kind="waivers" title="Waiver Wire" subtitle="Season to date • latest pickups">
            {waiverRows.length ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40">
                {waiverRows.map((r, idx) => (
                  <div key={idx} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <TeamAvatar team={r.team} avatarUrl={getAvatarUrl(r.rosterId)} size={28} />
                        <div className="truncate text-sm font-semibold text-zinc-200">{r.team}</div>
                      </div>
                      <Pill>{`+${Math.min(r.players.length, 4)}`}</Pill>
                    </div>
                    <Chips items={r.players} />
                    {idx !== waiverRows.length - 1 ? (
                      <div className="mt-3">
                        <Divider />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-400">No waiver activity found.</div>
            )}
          </CardShell>

          <CardShell kind="trades" title="Trades" subtitle="Season to date • most recent first">
            {tradeRows.length ? (
              <div className="space-y-3">
                {tradeRows.map((t, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <TeamAvatar team={t.aTeam} avatarUrl={getAvatarUrl(t.aRid)} size={28} />
                        <span className="truncate text-sm font-semibold text-zinc-200">{t.aTeam}</span>
                        <span className="text-zinc-500">↔</span>
                        <TeamAvatar team={t.bTeam} avatarUrl={getAvatarUrl(t.bRid)} size={28} />
                        <span className="truncate text-sm font-semibold text-zinc-200">{t.bTeam}</span>
                      </div>
                      <Pill>Trade</Pill>
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-zinc-400">
                      <div>
                        <span className="font-medium text-zinc-300">{t.aTeam}</span> gets
                        <div className="mt-1">
                          <Chips items={t.aGets} />
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="font-medium text-zinc-300">{t.bTeam}</span> gets
                        <div className="mt-1">
                          <Chips items={t.bGets} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-400">No trades found.</div>
            )}
          </CardShell>

          <CardShell kind="power" title="Power Rankings" subtitle="Top 5 right now">
            {powerRows.length ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40">
                {powerRows.map((r, idx) => (
                  <div key={r.rank} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs font-semibold text-zinc-200">
                        {r.rank}
                      </div>
                      <TeamAvatar team={r.team} avatarUrl={getAvatarUrl(r.rosterId)} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-200">{r.team}</div>
                        <div className="mt-1 text-xs text-zinc-400">{r.note}</div>
                      </div>
                    </div>

                    {idx !== powerRows.length - 1 ? (
                      <div className="mt-3">
                        <Divider />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-400">No data yet.</div>
            )}
          </CardShell>
        </section>

        {/* Week selector between rows */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
              disabled={selectedWeek <= 1 || weeklyLoading}
              className={cx(
                "h-11 md:h-10 rounded-full border px-4 text-sm transition",
                selectedWeek <= 1 || weeklyLoading
                  ? "border-zinc-800 text-zinc-600"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900/50"
              )}
            >
              ← Prev
            </button>

            <div className="relative">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="h-11 md:h-10 min-w-[120px] md:min-w-[110px] cursor-pointer appearance-none rounded-full border border-zinc-800 bg-zinc-950/60 px-4 pr-10 text-sm font-semibold text-zinc-200 outline-none transition hover:bg-zinc-900/50 focus:border-zinc-700"
              >
                {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w} className="bg-zinc-950 text-zinc-200">
                    Week {w}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                ▾
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedWeek((w) => Math.min(maxWeek, w + 1))}
              disabled={selectedWeek >= maxWeek || weeklyLoading}
              className={cx(
                "h-11 md:h-10 rounded-full border px-4 text-sm transition",
                selectedWeek >= maxWeek || weeklyLoading
                  ? "border-zinc-800 text-zinc-600"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-200 hover:bg-zinc-900/50"
              )}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Row 2 */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardShell kind="motw" title="Matchup of the Week" subtitle={wk}>
            {weeklyLoading ? (
              <div className="text-sm text-zinc-400">Loading week…</div>
            ) : motw ? (
              <TeamScoreBox {...motw} getAvatarUrl={getAvatarUrl} />
            ) : (
              <div className="text-sm text-zinc-400">No matchup pairs found for this week.</div>
            )}
          </CardShell>

          <CardShell kind="blowout" title="Biggest Blowout" subtitle={wk}>
            {weeklyLoading ? (
              <div className="text-sm text-zinc-400">Loading week…</div>
            ) : blowout ? (
              <TeamScoreBox {...blowout} getAvatarUrl={getAvatarUrl} />
            ) : (
              <div className="text-sm text-zinc-400">No matchup pairs found for this week.</div>
            )}
          </CardShell>

          <CardShell kind="lucky" title="Luckiest Win" subtitle={wk}>
            {weeklyLoading ? (
              <div className="text-sm text-zinc-400">Loading week…</div>
            ) : lucky ? (
              <TeamScoreBox {...lucky} getAvatarUrl={getAvatarUrl} />
            ) : (
              <div className="text-sm text-zinc-400">No matchup pairs found for this week.</div>
            )}
          </CardShell>
        </section>
      </div>
    );
  }, [
    error,
    loading,
    weeklyLoading,
    waiverRows,
    tradeRows,
    powerRows,
    currentWeek,
    selectedWeek,
    maxWeek,
    motw,
    blowout,
    lucky,
    avatarByRoster,
  ]);

  return <div>{content}</div>;
}
