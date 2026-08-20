import { useQuery } from "@tanstack/react-query";

export interface MatchupsData {
  currentWeek: number;
  week: number;
  users: any[];
  rosters: any[];
  matchups: any[];
  fetchedAt: string;
}

async function fetchMatchups(week?: number): Promise<MatchupsData> {
  const url = week ? `/api/matchups?week=${week}` : "/api/matchups";
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

/**
 * React Query hook for fetching matchups data from /api/matchups
 *
 * Features:
 * - Automatic caching per week
 * - Background refetching
 * - Automatic retries
 *
 * @example
 * const { data, isLoading, error, refetch } = useMatchupsQuery(1);
 */
export function useMatchupsQuery(week?: number) {
  return useQuery({
    queryKey: ["matchups", week],
    queryFn: () => fetchMatchups(week),
    // Refetch every 2 minutes
    refetchInterval: 2 * 60 * 1000,
    // Keep previous data while loading new week
    placeholderData: (previousData) => previousData,
  });
}
