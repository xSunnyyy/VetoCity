import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/app/lib/githubStore";
import { requireBillysAuth } from "@/app/lib/billysReportAuth";

function unauthorized() {
  return NextResponse.json(
    { error: "Not authorized — enter the passcode to add, edit, or delete reports." },
    { status: 401 }
  );
}

const FILE_PATH = "data/billys-report.json";

type MatchupRow = {
  id: string;
  matchup: string;
  report: string;
  // Added for auto-populated reports (weeks pulled from Sleeper with a
  // winner pick) — optional so older, freely-typed entries keep working.
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
  // Added for auto-populated reports — optional for the same reason.
  season?: string;
  week?: number;
  leagueId?: string;
};

function sortNewestFirst(entries: ReportEntry[]) {
  return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function parseMatchupRows(rawRows: any): MatchupRow[] {
  return (Array.isArray(rawRows) ? rawRows : [])
    .map((r: any, i: number) => {
      const row: MatchupRow = {
        id: `${Date.now()}-${i}`,
        matchup: String(r?.matchup || "").trim(),
        report: String(r?.report || "").trim(),
      };

      if (Number.isFinite(Number(r?.rosterIdA))) row.rosterIdA = Number(r.rosterIdA);
      if (Number.isFinite(Number(r?.rosterIdB))) row.rosterIdB = Number(r.rosterIdB);
      if (typeof r?.teamA === "string" && r.teamA) row.teamA = r.teamA;
      if (typeof r?.teamB === "string" && r.teamB) row.teamB = r.teamB;
      if (r?.winnerRosterId != null && Number.isFinite(Number(r.winnerRosterId))) {
        row.winnerRosterId = Number(r.winnerRosterId);
      }

      return row;
    })
    .filter((r: MatchupRow) => r.matchup || r.report || r.winnerRosterId != null);
}

function parseEntryFields(body: any) {
  const title = String(body?.title || "").trim();
  const matchups = parseMatchupRows(body?.matchups);

  const season = typeof body?.season === "string" && body.season ? body.season : undefined;
  const week = Number.isFinite(Number(body?.week)) ? Number(body.week) : undefined;
  const leagueId = typeof body?.leagueId === "string" && body.leagueId ? body.leagueId : undefined;

  return { title, matchups, season, week, leagueId };
}

export async function GET() {
  try {
    const { data } = await readJsonFile<ReportEntry[]>(FILE_PATH, []);
    return NextResponse.json({ entries: sortNewestFirst(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load Billy's Report" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!requireBillysAuth(req)) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const { title, matchups, season, week, leagueId } = parseEntryFields(body);

    if (!title || !matchups.length) {
      return NextResponse.json(
        { error: "A title and at least one matchup row (with a pick or a take filled in) are required." },
        { status: 400 }
      );
    }

    const entry: ReportEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      matchups,
      createdAt: new Date().toISOString(),
      ...(season ? { season } : {}),
      ...(week != null ? { week } : {}),
      ...(leagueId ? { leagueId } : {}),
    };

    // Retry once in case another write raced us and moved the file's sha.
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, sha } = await readJsonFile<ReportEntry[]>(FILE_PATH, []);
        const next = [...data, entry];
        await writeJsonFile(FILE_PATH, next, sha, `Add Billy's Report: ${title}`);
        return NextResponse.json({ entries: sortNewestFirst(next) }, { status: 201 });
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to save the report" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!requireBillysAuth(req)) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const { title, matchups, season, week, leagueId } = parseEntryFields(body);

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!title || !matchups.length) {
      return NextResponse.json(
        { error: "A title and at least one matchup row (with a pick or a take filled in) are required." },
        { status: 400 }
      );
    }

    // Retry once in case another write raced us and moved the file's sha.
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, sha } = await readJsonFile<ReportEntry[]>(FILE_PATH, []);
        const existing = data.find((e) => e.id === id);

        if (!existing) {
          return NextResponse.json({ error: "That report no longer exists." }, { status: 404 });
        }

        const updated: ReportEntry = {
          ...existing,
          title,
          matchups,
          updatedAt: new Date().toISOString(),
          ...(season ? { season } : { season: existing.season }),
          ...(week != null ? { week } : { week: existing.week }),
          ...(leagueId ? { leagueId } : { leagueId: existing.leagueId }),
        };

        const next = data.map((e) => (e.id === id ? updated : e));
        await writeJsonFile(FILE_PATH, next, sha, `Edit Billy's Report: ${title}`);
        return NextResponse.json({ entries: sortNewestFirst(next) });
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update the report" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!requireBillysAuth(req)) return unauthorized();

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Retry once in case another write raced us and moved the file's sha.
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, sha } = await readJsonFile<ReportEntry[]>(FILE_PATH, []);
        const next = data.filter((e) => e.id !== id);

        if (next.length === data.length) {
          return NextResponse.json({ error: "That report no longer exists." }, { status: 404 });
        }

        await writeJsonFile(FILE_PATH, next, sha, `Delete Billy's Report entry ${id}`);
        return NextResponse.json({ entries: sortNewestFirst(next) });
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete the report" }, { status: 500 });
  }
}
