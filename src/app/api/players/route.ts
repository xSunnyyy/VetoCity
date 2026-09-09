import { NextResponse } from "next/server";

// Sleeper's own docs ask that this endpoint (their full NFL player database,
// several MB of JSON) not be called more than roughly once a day per app —
// yet Movement and Rosters were each fetching it directly from the browser
// on every fresh tab, with no shared cache across visitors. Proxying it
// through our own route lets us (1) cache it once on the server so most
// requests never hit Sleeper at all, (2) send Cache-Control headers so a
// CDN/browser can reuse the same response across users and repeat visits,
// and (3) strip it down to only the fields the UI actually reads.
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

type PlayerMeta = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
};

let cache: { ts: number; data: Record<string, PlayerMeta> } | null = null;
let inflight: Promise<Record<string, PlayerMeta>> | null = null;

async function loadPlayers(): Promise<Record<string, PlayerMeta>> {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for players/nfl`);

  const raw = (await res.json()) as Record<string, any>;
  const trimmed: Record<string, PlayerMeta> = {};

  for (const [id, p] of Object.entries(raw || {})) {
    trimmed[id] = {
      full_name: p?.full_name || undefined,
      first_name: p?.first_name || undefined,
      last_name: p?.last_name || undefined,
      position: p?.position || undefined,
      team: p?.team || undefined,
    };
  }

  return trimmed;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data, {
        headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
      });
    }

    // Collapse concurrent cold-start requests into a single upstream fetch
    // instead of every one of them separately pulling several MB from Sleeper.
    if (!inflight) {
      inflight = loadPlayers().finally(() => {
        inflight = null;
      });
    }

    const data = await inflight;
    cache = { ts: now, data };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load players" }, { status: 500 });
  }
}
