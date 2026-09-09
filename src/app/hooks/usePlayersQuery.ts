import { useQuery } from "@tanstack/react-query";

export type PlayerMeta = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
};

export type PlayerMap = Record<string, PlayerMeta>;

async function fetchPlayers(): Promise<PlayerMap> {
  const res = await fetch("/api/players");
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

/**
 * React Query hook for the (server-proxied, trimmed) NFL player database.
 * This barely changes intra-day, so it gets a much longer stale time than
 * the live league data hooks — once fetched, every page that renders
 * player names/positions/teams shares the same cached copy instead of each
 * one re-fetching it.
 *
 * @example
 * const { data: players } = usePlayersQuery();
 */
export function usePlayersQuery() {
  return useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
    staleTime: 60 * 60 * 1000, // 1h
  });
}
