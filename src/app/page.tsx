import Image from "next/image";
import FloatingNav from "@/app/components/FloatingNav";
import { ChampionshipBanners } from "./components/ChampionshipBanners";
import { WeeklyMatchups } from "./components/WeeklyMatchups";
import { LeagueAtAGlance } from "./components/LeagueAtAGlance";
import { LeagueHistory } from "./components/LeagueHistory";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      {/* leave space for floating nav */}
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:pt-28">
        {/* Small, clean hero (not a banner) */}
        <section className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image
            src="/veto-city-logo.png"
            alt="Veto City"
            width={900}
            height={758}
            priority
            className="h-24 w-auto md:h-32"
          />
        </section>

        <ChampionshipBanners />

        <WeeklyMatchups />

        <LeagueAtAGlance />

        <LeagueHistory />
      </div>
    </main>
  );
}
