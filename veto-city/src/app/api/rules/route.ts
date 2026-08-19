import { NextResponse } from "next/server";
import { LEAGUE_ID, SLEEPER_BASE as BASE } from "@/app/lib/vetocity";

let cache: { ts: number; data: any } | null = null;
const TTL_MS = 5 * 60 * 1000; // rules rarely change mid-season

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

const WAIVER_TYPE_LABELS: Record<number, string> = {
  0: "Rolling Waivers",
  1: "Reverse Standings",
  2: "FAAB",
};

const PLAYOFF_ROUND_LABELS: Record<number, string> = {
  0: "1 week per round",
  1: "1 week per round (top seeds get a bye)",
  2: "2 weeks for the first round, 1 week after",
};

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) return NextResponse.json(cache.data);

    const league: any = await j(`${BASE}/league/${LEAGUE_ID}`);
    const draft: any = league?.draft_id
      ? await j(`${BASE}/draft/${league.draft_id}`).catch(() => null)
      : null;

    const settings = league?.settings || {};
    const scoring = league?.scoring_settings || {};
    const rosterPositions: string[] = Array.isArray(league?.roster_positions)
      ? league.roster_positions
      : [];

    const starters = rosterPositions.filter((p) => p !== "BN");
    const benchSlots = rosterPositions.filter((p) => p === "BN").length;
    const irSlots = Number(settings.reserve_slots ?? 0) || 0;
    const taxiSlots = Number(settings.taxi_slots ?? 0) || 0;

    const startCounts = new Map<string, number>();
    for (const pos of starters) startCounts.set(pos, (startCounts.get(pos) ?? 0) + 1);
    const lineup = [...startCounts.entries()].map(([pos, count]) => (count > 1 ? `${count} ${pos}` : pos));

    const hasKicker = rosterPositions.includes("K");
    const hasDST = rosterPositions.includes("DEF") || rosterPositions.includes("DST");

    const recPts = Number(scoring.rec ?? 0) || 0;
    const scoringType = recPts >= 1 ? "Full PPR" : recPts > 0 ? `${recPts} PPR` : "Standard";

    const playoffWeekStart = Number(settings.playoff_week_start ?? 0) || 0;
    const lastScoredLeg = Number(settings.last_scored_leg ?? 0) || 0;
    const regularSeasonWeeks = playoffWeekStart > 0 ? playoffWeekStart - 1 : Number(settings.leg ?? 0) || 0;

    const waiverType = Number(settings.waiver_type ?? 0) || 0;
    const maxKeepers = Number(settings.max_keepers ?? 0) || 0;

    const data = {
      leagueName: safeStr(league?.name) || "League",
      season: safeStr(league?.season) || "",
      numTeams: Number(settings.num_teams ?? league?.total_rosters ?? 0) || 0,

      scoringType,
      lineup,
      benchSlots,
      irSlots,
      taxiSlots,
      hasKicker,
      hasDST,

      draft: draft
        ? {
            type: safeStr(draft.type) || "snake",
            startTime: Number(draft.start_time) || null,
            rounds: Number(draft?.settings?.rounds ?? 0) || null,
          }
        : null,

      regularSeasonWeeks,
      playoffTeams: Number(settings.playoff_teams ?? 0) || 0,
      playoffWeekStart,
      playoffWeekEnd: lastScoredLeg || playoffWeekStart,
      playoffRoundLabel: PLAYOFF_ROUND_LABELS[Number(settings.playoff_round_type ?? 0)] ?? null,

      tradeDeadlineWeek: Number(settings.trade_deadline ?? 0) || 0,
      vetoVotesNeeded: Number(settings.veto_votes_needed ?? 0) || 0,

      waiverType: WAIVER_TYPE_LABELS[waiverType] ?? "Waivers",
      waiverBudget: waiverType === 2 ? Number(settings.waiver_budget ?? 0) || 0 : null,
      waiverClearDays: Number(settings.waiver_clear_days ?? 0) || 0,

      maxKeepers,

      scoring: {
        passYd: Number(scoring.pass_yd ?? 0) || 0,
        passTd: Number(scoring.pass_td ?? 0) || 0,
        passInt: Number(scoring.pass_int ?? 0) || 0,
        pass2pt: Number(scoring.pass_2pt ?? 0) || 0,
        rushYd: Number(scoring.rush_yd ?? 0) || 0,
        rushTd: Number(scoring.rush_td ?? 0) || 0,
        recYd: Number(scoring.rec_yd ?? 0) || 0,
        recTd: Number(scoring.rec_td ?? 0) || 0,
        rec: recPts,
        fumLost: Number(scoring.fum_lost ?? 0) || 0,
        hasKicker,
        hasDST,
      },

      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: now, data };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load league rules" }, { status: 500 });
  }
}
