import Link from "next/link";
import FloatingNav from "@/app/components/FloatingNav";
import { DashboardCards } from "./components/DashboardCards";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      {/* leave space for floating nav */}
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-20 md:pt-28">
        {/* Small, clean hero (not a banner) */}
        <section className="mb-8 flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Veto City</h1>
          <Link
            href="/league/drafts"
            className="inline-flex h-11 md:h-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/70 px-6 text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            View the Draft
          </Link>
        </section>

        <DashboardCards />
      </div>
    </main>
  );
}
