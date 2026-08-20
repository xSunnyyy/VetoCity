import { useQuery } from "@tanstack/react-query";

export interface LeagueDataOptions {
  /**
   * Week number to fetch (optional)
   */
  week?: number;
  /**
   * Whether to fetch data automatically on mount (default: true)
   */
  enabled?: boolean;
}

export interface LeagueData {
  league: any;
  users: any[];
  rosters: any[];
  transactions: any[];
  matchups: any[];
  currentWeek: number;
  maxWeek: number;
  txnWeek: number;
  fetchedAt: string;
}

async function fetchLeagueData(week?: number): Promise<LeagueData> {
  const url = week ? `/api/league?week=${week}` : "/api/league";
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

/**
 * React Query hook for fetching league data from /api/league
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - Background refetching on window focus
 * - Automatic retries on failure
 * - Loading and error states
 * - Query invalidation support
 *
 * @example
 * const { data, isLoading, error, refetch } = useLeagueDataQuery({ week: 1 });
 */
export function useLeagueDataQuery(options: LeagueDataOptions = {}) {
  const { week, enabled = true } = options;

  return useQuery({
    queryKey: ["league", week],
    queryFn: () => fetchLeagueData(week),
    enabled,
    // Refetch every 2 minutes if window has focus
    refetchInterval: 2 * 60 * 1000,
    // Keep previous data while fetching new data
    placeholderData: (previousData) => previousData,
  });
}
