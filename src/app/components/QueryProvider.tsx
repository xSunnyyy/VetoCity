"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * React Query Provider for the application
 * Provides caching, background refetching, and optimistic updates
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: How long data is considered fresh (5 minutes)
            staleTime: 5 * 60 * 1000,
            // Cache time: How long unused data stays in cache (10 minutes)
            gcTime: 10 * 60 * 1000,
            // Refetch on window focus (useful for league updates)
            refetchOnWindowFocus: true,
            // Retry failed requests
            retry: 1,
            // Refetch on mount only if data is stale
            refetchOnMount: "always",
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
