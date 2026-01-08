import { useEffect, useState } from "react";

export interface StandingsData {
  league: any;
  users: any[];
  rosters: any[];
  currentWeek: number;
  matchupsByWeek: { week: number; matchups: any[] }[];
  fetchedAt: string;
}

export interface UseStandingsReturn {
  /**
   * Standings data
   */
  data: StandingsData | null;
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
 * Custom hook for fetching standings data from /api/standings
 */
export function useStandings(): UseStandingsReturn {
  const [data, setData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/standings", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || `API error ${res.status}`);
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load standings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
