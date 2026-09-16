import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { LEAGUE_ID, SLEEPER_BASE as BASE } from "@/app/lib/vetocity";
import { buildTeams } from "@/app/lib/league";
import { getPlayersMap, playerName } from "@/app/lib/players";

// In-memory cache, keyed by whichever week the article covers — a fresh
// article is only worth generating once a new week finishes (or, in the
// off-season, once a day) rather than on every page view.
let cache: { key: string; ts: number; data: NewsPayload } | null = null;
const TTL_MS = 2 * 60 * 60 * 1000; // 2h backstop, in case scores update mid-cache

const WEEK_MAX = 18;
const weekNumbers = Array.from({ length: WEEK_MAX }, (_, i) => i + 1);

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function pointsFromRosterSettings(s: any, key: "fpts" | "fpts_against") {
  const whole = Number(s?.[key] ?? 0) || 0;
  const decKey = key === "fpts" ? "fpts_decimal" : "fpts_against_decimal";
  const dec = Number(s?.[decKey] ?? 0) || 0;
  return whole + dec / 100;
}

function txnTime(t: any): number {
  return (
    (typeof t.status_updated === "number" ? t.status_updated : 0) ||
    (typeof t.created === "number" ? t.created : 0) ||
    0
  );
}

function pairMatchupsByWeek(matchups: any[]) {
  const byMatchup = new Map<number, any[]>();
  for (const m of matchups || []) {
    if (typeof m?.matchup_id !== "number") continue;
    const arr = byMatchup.get(m.matchup_id) ?? [];
    arr.push(m);
    byMatchup.set(m.matchup_id, arr);
  }
  return [...byMatchup.values()].filter((arr) => arr.length >= 2);
}

/** The most recent week with real (played) scores — the "week that just
 * passed." Fetches every week in parallel rather than scanning backward. */
function lastScoredWeek(matchupsByWeek: any[][]): number | null {
  for (let w = matchupsByWeek.length; w >= 1; w--) {
    const m = matchupsByWeek[w - 1];
    const played =
      Array.isArray(m) && m.some((x) => typeof x?.points === "number" && x.points > 0);
    if (played) return w;
  }
  return null;
}

type Briefing = {
  mode: "recap" | "preview";
  leagueName: string;
  season: string;
  weekJustPlayed: number | null;
  upcomingWeek: number | null;
  standings: {
    team: string;
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
  }[];
  lastWeekGames: { teamA: string; scoreA: number; teamB: string; scoreB: number }[];
  upcomingGames: { teamA: string; teamB: string; teamARecord: string; teamBRecord: string }[];
  recentMoves: { team: string; kind: "trade" | "waiver"; detail: string }[];
};

async function buildBriefing(): Promise<Briefing> {
  const [league, users, rosters] = await Promise.all([
    j<any>(`${BASE}/league/${LEAGUE_ID}`),
    j<any[]>(`${BASE}/league/${LEAGUE_ID}/users`).catch(() => []),
    j<any[]>(`${BASE}/league/${LEAGUE_ID}/rosters`).catch(() => []),
  ]);

  const [matchupsByWeek, txnsByWeek, players] = await Promise.all([
    Promise.all(weekNumbers.map((w) => j<any[]>(`${BASE}/league/${LEAGUE_ID}/matchups/${w}`).catch(() => []))),
    Promise.all(
      weekNumbers.map((w) => j<any[]>(`${BASE}/league/${LEAGUE_ID}/transactions/${w}`).catch(() => []))
    ),
    getPlayersMap().catch(() => null),
  ]);

  const teams = buildTeams(users, rosters);
  const teamName = (rid: number) => teams.get(rid)?.name ?? `Team ${rid}`;

  const weekJustPlayed = lastScoredWeek(matchupsByWeek);
  const maxWeek = Math.max(WEEK_MAX, Number(league?.settings?.leg ?? 0) || 0);
  const upcomingWeek =
    weekJustPlayed != null
      ? weekJustPlayed + 1 <= maxWeek
        ? weekJustPlayed + 1
        : null
      : 1;

  // Standings, from each roster's season-cumulative settings.
  const standings = (rosters || [])
    .filter((r) => Number.isFinite(Number(r?.roster_id)))
    .map((r) => ({
      team: teamName(Number(r.roster_id)),
      wins: Number(r?.settings?.wins ?? 0) || 0,
      losses: Number(r?.settings?.losses ?? 0) || 0,
      ties: Number(r?.settings?.ties ?? 0) || 0,
      pointsFor: pointsFromRosterSettings(r?.settings || {}, "fpts"),
      pointsAgainst: pointsFromRosterSettings(r?.settings || {}, "fpts_against"),
    }))
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);

  const recordFor = (rid: number) => {
    const r = (rosters || []).find((x) => Number(x?.roster_id) === rid);
    const s = r?.settings || {};
    const w = Number(s.wins ?? 0) || 0;
    const l = Number(s.losses ?? 0) || 0;
    const t = Number(s.ties ?? 0) || 0;
    return t ? `${w}-${l}-${t}` : `${w}-${l}`;
  };

  const lastWeekGames =
    weekJustPlayed != null
      ? pairMatchupsByWeek(matchupsByWeek[weekJustPlayed - 1]).map((pair) => {
          const [a, b] = pair;
          return {
            teamA: teamName(Number(a.roster_id)),
            scoreA: Number(a.points ?? 0),
            teamB: teamName(Number(b.roster_id)),
            scoreB: Number(b.points ?? 0),
          };
        })
      : [];

  const upcomingGames =
    upcomingWeek != null
      ? pairMatchupsByWeek(matchupsByWeek[upcomingWeek - 1]).map((pair) => {
          const [a, b] = pair;
          const aRid = Number(a.roster_id);
          const bRid = Number(b.roster_id);
          return {
            teamA: teamName(aRid),
            teamB: teamName(bRid),
            teamARecord: recordFor(aRid),
            teamBRecord: recordFor(bRid),
          };
        })
      : [];

  // Most recent trades/waivers across the season, newest first.
  const allTxns = txnsByWeek.flat().sort((a, b) => txnTime(b) - txnTime(a));

  const recentMoves: Briefing["recentMoves"] = [];
  for (const t of allTxns) {
    if (recentMoves.length >= 8) break;
    const type = safeStr(t?.type);

    if (type === "trade") {
      const rosterIds: number[] = (t?.roster_ids ?? []).map((x: any) => Number(x));
      const [aRid, bRid] = rosterIds;
      if (aRid == null || bRid == null) continue;

      const aGets: string[] = [];
      const bGets: string[] = [];
      if (t?.adds) {
        for (const [pid, rid] of Object.entries(t.adds)) {
          if (Number(rid) === aRid) aGets.push(playerName(players, pid));
          else if (Number(rid) === bRid) bGets.push(playerName(players, pid));
        }
      }

      recentMoves.push({
        team: teamName(aRid),
        kind: "trade",
        detail: `${teamName(aRid)} sent ${bGets.length ? bGets.join(", ") : "picks/other assets"} to ${teamName(
          bRid
        )} for ${aGets.length ? aGets.join(", ") : "picks/other assets"}`,
      });
    } else if (type === "waiver" || type === "free_agent") {
      const rosterIds: number[] = (t?.roster_ids ?? [])
        .map((x: any) => Number(x))
        .filter((n: number) => Number.isFinite(n));
      const firstRid = rosterIds[0] ?? (t?.adds ? Number(Object.values(t.adds)[0]) : NaN);
      if (!Number.isFinite(firstRid)) continue;

      const added = t?.adds ? Object.keys(t.adds).map((pid) => playerName(players, pid)) : [];
      const dropped = t?.drops ? Object.keys(t.drops).map((pid) => playerName(players, pid)) : [];

      recentMoves.push({
        team: teamName(firstRid),
        kind: "waiver",
        detail: `${teamName(firstRid)} added ${added.length ? added.join(", ") : "a free agent"}${
          dropped.length ? `, dropped ${dropped.join(", ")}` : ""
        }`,
      });
    }
  }

  return {
    mode: weekJustPlayed != null ? "recap" : "preview",
    leagueName: safeStr(league?.name) || "the league",
    season: safeStr(league?.season) || "",
    weekJustPlayed,
    upcomingWeek,
    standings,
    lastWeekGames,
    upcomingGames,
    recentMoves,
  };
}

const NewsSchema = z.object({
  byline: z.string().describe("The beat writer's full byline, e.g. 'By Chip Waivers'"),
  headline: z.string().describe("A punchy, funny headline for this week's article"),
  standfirst: z.string().describe("One witty sentence teasing the article, under the headline"),
  recap: z
    .array(
      z.object({
        headline: z.string().describe("A short, punny micro-headline for this one matchup"),
        body: z.string().describe("2-4 witty sentences recapping this specific matchup"),
      })
    )
    .describe("One entry per game played last week. Empty array if no games were played yet."),
  powerMoves: z
    .string()
    .describe(
      "A witty paragraph about recent trades/waiver moves. If none happened, riff on that instead of inventing any."
    ),
  lookingAhead: z
    .array(
      z.object({
        matchup: z.string().describe("e.g. 'Team A vs. Team B'"),
        take: z.string().describe("A witty prediction or trash-talk line for this upcoming matchup"),
      })
    )
    .describe("One entry per upcoming matchup. Empty array if none are scheduled."),
  closingLine: z.string().describe("A short, witty sign-off line"),
});

export type NewsPayload = z.infer<typeof NewsSchema> & {
  weekJustPlayed: number | null;
  upcomingWeek: number | null;
  season: string;
  fetchedAt: string;
};

const SYSTEM_PROMPT = `You are Chip Waivers, the beat writer for a fantasy football league's news page. You write like a mix of a sports-talk radio host and a tabloid sports columnist: punchy, irreverent, quick with a nickname or a callback joke, genuinely funny — but never mean. The "teams" you're covering are fantasy football rosters with jokey names, run by friends in the same league, so you can roast a TEAM's lineup decisions, a blowout loss, or a lopsided trade mercilessly, but keep it affectionate, not cruel, and never say anything that reads as an attack on a real person.

You will be given a JSON "briefing" with the actual results, standings, and transactions for this league. Use ONLY the facts in that briefing. Never invent a score, a record, a player name, or a transaction that isn't in the briefing. If a section of the briefing is empty (e.g. no trades happened, or no games have been played yet because it's the preseason), write around that honestly and make a joke out of the absence rather than fabricating content.

When "mode" is "preview" (no games played yet), skip the recap and instead hype up the upcoming week like a season-opener preview.`;

async function generateArticle(briefing: Briefing) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err: any = new Error(
      "The AI beat writer isn't configured yet — set ANTHROPIC_API_KEY in this app's environment."
    );
    err.code = "missing_api_key";
    throw err;
  }

  const anthropic = new Anthropic({ apiKey });

  // Streamed rather than a plain non-streaming call: a full article (several
  // game recaps plus a preview section) can run long enough at max_tokens
  // that a non-streaming request risks hitting a serverless function's HTTP
  // timeout. Streaming has no such ceiling — we just read it to completion.
  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 12000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is this week's briefing:\n\n${JSON.stringify(briefing, null, 2)}\n\nWrite the article now.`,
      },
    ],
    output_config: {
      format: zodOutputFormat(NewsSchema),
    },
  });

  const response = await stream.finalMessage();
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );

  if (!textBlock) {
    throw new Error("The beat writer turned in a draft we couldn't read — please try again.");
  }

  const parsed = NewsSchema.safeParse(JSON.parse(textBlock.text));
  if (!parsed.success) {
    throw new Error("The beat writer turned in a draft we couldn't read — please try again.");
  }

  return parsed.data;
}

export async function GET() {
  try {
    const briefing = await buildBriefing();
    const cacheKey = `${briefing.mode}:${briefing.weekJustPlayed ?? "pre"}`;

    const now = Date.now();
    if (cache && cache.key === cacheKey && now - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data);
    }

    const article = await generateArticle(briefing);

    const payload: NewsPayload = {
      ...article,
      weekJustPlayed: briefing.weekJustPlayed,
      upcomingWeek: briefing.upcomingWeek,
      season: briefing.season,
      fetchedAt: new Date().toISOString(),
    };

    cache = { key: cacheKey, ts: now, data: payload };
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load the news.", code: e?.code },
      { status: e?.code === "missing_api_key" ? 501 : 500 }
    );
  }
}
