import { NextResponse } from "next/server";
import { getAllNews } from "@/app/lib/newsFeeds";

// Aggregated headlines change on the outlets' own schedule, not per-request —
// cache the computed response for 10 minutes instead of re-fetching every
// RSS feed on every page view.
export const revalidate = 600;

export async function GET() {
  try {
    const data = await getAllNews();

    if (data.articles.length === 0) {
      return NextResponse.json(
        { error: "No news sources were reachable right now. Try again shortly." },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load news.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
