import { useEffect, useState } from "react";

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

export interface UseLeagueDataReturn {
  /**
   * League data
   */
  data: LeagueData | null;
  /**
   * Loading state
   */
  loading: boolean;
  /**
   * Error message if fetch failed
   */
  error: string | null;
  /**
   * Refetch the data
   */
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching league data from /api/league
 * Handles loading states, errors, and refetching
 */
export function useLeagueData(options: LeagueDataOptions = {}): UseLeagueDataReturn {
  const { week, enabled = true } = options;

  const [data, setData] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = week ? `/api/league?week=${week}` : "/api/league";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || `API error ${res.status}`);
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load league data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
