// Shared, in-memory-cached fetch of Sleeper's NFL player database, trimmed
// to the handful of fields the app actually uses. Sleeper's own docs ask
// that this endpoint not be called more than roughly once a day per app, so
// every consumer — the /api/players proxy the browser hits, and any other
// server-side code (like the news generator) that needs to resolve a player
// id to a name — shares this one cache instead of each doing its own fetch.

const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export type PlayerMeta = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
};

export type PlayerMap = Record<string, PlayerMeta>;

let cache: { ts: number; data: PlayerMap } | null = null;
let inflight: Promise<PlayerMap> | null = null;

async function loadPlayers(): Promise<PlayerMap> {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Sleeper error ${res.status} for players/nfl`);

  const raw = (await res.json()) as Record<string, any>;
  const trimmed: PlayerMap = {};

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

export async function getPlayersMap(): Promise<PlayerMap> {
  const now = Date.now();
  if (cache && now - cache.ts < TTL_MS) return cache.data;

  // Collapse concurrent cold-start requests into a single upstream fetch
  // instead of every one of them separately pulling several MB from Sleeper.
  if (!inflight) {
    inflight = loadPlayers().finally(() => {
      inflight = null;
    });
  }

  const data = await inflight;
  cache = { ts: now, data };
  return data;
}

export function playerName(players: PlayerMap | null | undefined, id: string) {
  const p = players?.[id];
  if (!p) return id;

  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || id;
  const suffix = [p.position, p.team].filter(Boolean).join(" · ");
  return suffix ? `${name} (${suffix})` : name;
}
