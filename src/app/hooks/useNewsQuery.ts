import { useQuery } from "@tanstack/react-query";

export type NewsCategory = "fantasy" | "nfl";

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: string | null;
  source: string;
  sourceId: string;
  category: NewsCategory;
}

export interface NewsSourceStatus {
  id: string;
  name: string;
  siteUrl: string;
  category: NewsCategory;
  ok: boolean;
}

export interface NewsData {
  articles: NewsArticle[];
  sources: NewsSourceStatus[];
  fetchedAt: string;
}

async function fetchNews(): Promise<NewsData> {
  const res = await fetch("/api/news");
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

/**
 * React Query hook for real fantasy football / NFL headlines from
 * /api/news — aggregated server-side from several outlets' public RSS
 * feeds (see lib/newsFeeds.ts). No AI writing involved.
 */
export function useNewsQuery() {
  return useQuery({
    queryKey: ["news"],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 10 * 60 * 1000, // matches the server's own cache window
  });
}
