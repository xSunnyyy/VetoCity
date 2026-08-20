import { useEffect, useState } from "react";

export interface MatchupsData {
  currentWeek: number;
  week: number;
  users: any[];
  rosters: any[];
  matchups: any[];
  fetchedAt: string;
}

export interface UseMatchupsReturn {
  /**
   * Matchups data
   */
  data: MatchupsData | null;
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
  refetch: (week?: number) => Promise<void>;
}

/**
 * Custom hook for fetching matchups data from /api/matchups
 */
export function useMatchups(initialWeek?: number): UseMatchupsReturn {
  const [data, setData] = useState<MatchupsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (week?: number) => {
    try {
      setLoading(true);
      setError(null);

      const url = week ? `/api/matchups?week=${week}` : "/api/matchups";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || `API error ${res.status}`);
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load matchups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(initialWeek);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWeek]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
