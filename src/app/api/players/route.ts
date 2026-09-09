import { NextResponse } from "next/server";
import { getPlayersMap } from "@/app/lib/players";

// Sleeper's own docs ask that this endpoint (their full NFL player database,
// several MB of JSON) not be called more than roughly once a day per app —
// yet Movement and Rosters were each fetching it directly from the browser
// on every fresh tab, with no shared cache across visitors. Proxying it
// through our own route lets us (1) cache it once on the server so most
// requests never hit Sleeper at all, (2) send Cache-Control headers so a
// CDN/browser can reuse the same response across users and repeat visits,
// and (3) strip it down to only the fields the UI actually reads.

export async function GET() {
  try {
    const data = await getPlayersMap();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load players" }, { status: 500 });
  }
}
