import { useQuery } from "@tanstack/react-query";

export interface StandingsData {
  league: any;
  users: any[];
  rosters: any[];
  currentWeek: number;
  matchupsByWeek: { week: number; matchups: any[] }[];
  fetchedAt: string;
}

async function fetchStandings(): Promise<StandingsData> {
  const res = await fetch("/api/standings", { cache: "no-store" });
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

/**
 * React Query hook for fetching standings data from /api/standings
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - Background refetching
 * - Automatic retries
 *
 * @example
 * const { data, isLoading, error, refetch } = useStandingsQuery();
 */
export function useStandingsQuery() {
  return useQuery({
    queryKey: ["standings"],
    queryFn: fetchStandings,
    // Refetch every 2 minutes
    refetchInterval: 2 * 60 * 1000,
  });
}
