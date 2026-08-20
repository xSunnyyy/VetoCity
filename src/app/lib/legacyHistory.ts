// Pre-Sleeper league history.
//
// Sleeper's app lets a commissioner manually type in champions/records for
// seasons that predate the league's actual Sleeper league_id chain (visible
// in-app under League History / Trophy Case). That data isn't backed by a
// real league object, so it's not reachable through Sleeper's public REST
// API — it only lives in Sleeper's own client. Transcribed here so it can
// merge with the live, API-driven seasons on the site.

export type LegacyManager = {
  name: string; // the name this manager went by that season
  managerId: string | null; // current Sleeper user_id, or null if no longer in the league
  ownerName: string; // current Sleeper display name, or "" if no longer in the league
  record: { wins: number; losses: number; ties: number };
};

export type LegacySeason = {
  season: string;
  champion: LegacyManager;
  runnerUp: LegacyManager;
  third: LegacyManager;
  lastPlace: LegacyManager;
};

// Legacy first name -> current Sleeper identity (or null if they've since
// left the league, in which case they show up as a standalone historical
// name with nothing to merge into).
const IDENTITY: Record<string, { managerId: string; ownerName: string } | null> = {
  Q: { managerId: "465361225488789504", ownerName: "Qcam" },
  Bak: { managerId: "464547435725713408", ownerName: "Baktiar" },
  Russ: { managerId: "96724966984531968", ownerName: "laddooruss" },
  Sunny: { managerId: "96746978331213824", ownerName: "Sunnyy" },
  Abbas: { managerId: "327125046650748928", ownerName: "abbyyzz" },
  Anik: { managerId: "466661023856717824", ownerName: "silver811" },
  Mickey: { managerId: "886715074151473152", ownerName: "coachMic" },
  Kam: { managerId: "96721947358281728", ownerName: "kamrulahsan3" },
  Mizan: { managerId: "342723414383054848", ownerName: "ReignOfKingpin" },
  Bilal: { managerId: "210835987486482432", ownerName: "bilal1990" },
  Adil: { managerId: "333704106105397248", ownerName: "Awm90" },
  Meshu: { managerId: "108991538486722560", ownerName: "teshu91" },
  Mahim: null,
  Shahed: null,
  Kazi: null,
};

function m(name: string, wins: number, losses: number): LegacyManager {
  const id = IDENTITY[name];
  return {
    name,
    managerId: id?.managerId ?? null,
    ownerName: id?.ownerName ?? "",
    record: { wins, losses, ties: 0 },
  };
}

// Newest first, matching the ordering the live Sleeper-season chain returns
// (this list picks up right where that chain's previous_league_id runs out).
export const LEGACY_SEASONS: LegacySeason[] = [
  {
    season: "2022",
    champion: m("Abbas", 8, 6),
    runnerUp: m("Russ", 8, 6),
    third: m("Anik", 10, 4),
    lastPlace: m("Sunny", 3, 11),
  },
  {
    season: "2021",
    champion: m("Anik", 7, 7),
    runnerUp: m("Russ", 7, 7),
    third: m("Q", 12, 2),
    lastPlace: m("Mahim", 4, 10),
  },
  {
    season: "2020",
    champion: m("Meshu", 9, 4),
    runnerUp: m("Anik", 9, 4),
    third: m("Abbas", 7, 6),
    lastPlace: m("Mizan", 5, 8),
  },
  {
    season: "2019",
    champion: m("Bak", 7, 6),
    runnerUp: m("Sunny", 8, 5),
    third: m("Q", 9, 4),
    lastPlace: m("Mahim", 4, 9),
  },
  {
    season: "2018",
    champion: m("Sunny", 7, 6),
    runnerUp: m("Anik", 8, 5),
    third: m("Abbas", 8, 5),
    lastPlace: m("Bilal", 5, 8),
  },
  {
    season: "2017",
    champion: m("Bak", 8, 5),
    runnerUp: m("Anik", 7, 6),
    third: m("Shahed", 9, 4),
    lastPlace: m("Abbas", 6, 7),
  },
];
