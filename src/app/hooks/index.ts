/**
 * Custom Hooks Library
 * Centralized exports for all custom React hooks
 */

// Basic fetch hooks (legacy)
export { useLeagueData } from "./useLeagueData";
export type { LeagueData, LeagueDataOptions, UseLeagueDataReturn } from "./useLeagueData";

export { useStandings } from "./useStandings";
export type { StandingsData, UseStandingsReturn } from "./useStandings";

export { useMatchups } from "./useMatchups";
export type { MatchupsData, UseMatchupsReturn } from "./useMatchups";

// React Query hooks (recommended)
export { useLeagueDataQuery } from "./useLeagueDataQuery";
export type { LeagueDataOptions as LeagueDataQueryOptions } from "./useLeagueDataQuery";

export { useStandingsQuery } from "./useStandingsQuery";
export type { StandingsData as StandingsQueryData } from "./useStandingsQuery";

export { useMatchupsQuery } from "./useMatchupsQuery";
export type { MatchupsData as MatchupsQueryData } from "./useMatchupsQuery";
