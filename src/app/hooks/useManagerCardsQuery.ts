import { useQuery } from "@tanstack/react-query";

export interface ManagerCardsData {
  leagueId: string;
  managersCount: number;
  rows: any[];
  fetchedAt: string;
}

async function fetchManagerCards(): Promise<ManagerCardsData> {
  const res = await fetch("/api/manager-cards");
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

/**
 * React Query hook for all-time manager stats from /api/manager-cards.
 * Unlike the live league/matchups/standings hooks, this is season-history
 * data that doesn't change mid-session, so it doesn't need the 2-minute
 * refetchInterval those use — the shared 5-minute staleTime (see
 * QueryProvider) is enough to make repeat visits to the Managers tab
 * instant instead of re-fetching and re-rendering a loading skeleton.
 *
 * @example
 * const { data, isLoading, error } = useManagerCardsQuery();
 */
export function useManagerCardsQuery() {
  return useQuery({
    queryKey: ["manager-cards"],
    queryFn: fetchManagerCards,
  });
}
