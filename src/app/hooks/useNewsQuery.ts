import { useQuery } from "@tanstack/react-query";

export interface NewsRecapItem {
  headline: string;
  body: string;
}

export interface NewsLookaheadItem {
  matchup: string;
  take: string;
}

export interface NewsData {
  byline: string;
  headline: string;
  standfirst: string;
  recap: NewsRecapItem[];
  powerMoves: string;
  lookingAhead: NewsLookaheadItem[];
  closingLine: string;
  weekJustPlayed: number | null;
  upcomingWeek: number | null;
  season: string;
  fetchedAt: string;
}

export class NewsNotConfiguredError extends Error {}

async function fetchNews(): Promise<NewsData> {
  const res = await fetch("/api/news");
  const json = await res.json();

  if (!res.ok || json.error) {
    if (res.status === 501 || json.code === "missing_api_key") {
      throw new NewsNotConfiguredError(json.error || "The AI beat writer isn't configured yet.");
    }
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

/**
 * React Query hook for the AI beat writer's weekly article from /api/news.
 * This is expensive (an LLM call) and only meaningfully changes once a week
 * completes, so it gets a much longer stale time than the live league data
 * hooks and no periodic refetchInterval.
 */
export function useNewsQuery() {
  return useQuery({
    queryKey: ["news"],
    queryFn: fetchNews,
    staleTime: 60 * 60 * 1000, // 1h
    retry: (failureCount, error) => !(error instanceof NewsNotConfiguredError) && failureCount < 1,
  });
}
