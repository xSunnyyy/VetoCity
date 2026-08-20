import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/app/lib/githubStore";

const FILE_PATH = "data/billys-report.json";

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

function sortNewestFirst(entries: ReportEntry[]) {
  return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim();

    const rawRows = Array.isArray(body?.matchups) ? body.matchups : [];
    const rows: MatchupRow[] = rawRows
      .map((r: any, i: number) => ({
        id: `${Date.now()}-${i}`,
        matchup: String(r?.matchup || "").trim(),
        report: String(r?.report || "").trim(),
      }))
      .filter((r: MatchupRow) => r.matchup || r.report);

    if (!title || !rows.length) {
      return NextResponse.json(
        { error: "A title and at least one matchup row (with a matchup or report filled in) are required." },
        { status: 400 }
      );
    }

    const entry: ReportEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      matchups: rows,
      createdAt: new Date().toISOString(),
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
