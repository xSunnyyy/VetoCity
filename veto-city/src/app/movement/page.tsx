import FloatingNav from "@/app/components/FloatingNav";
import { DashboardCards } from "@/app/components/DashboardCards";

export default function MovementPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:pt-28">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Movement</h1>
          <div className="mt-2 text-sm text-zinc-400">Waivers, trades, power rankings, and this week&apos;s action</div>
        </div>

        <DashboardCards />
      </div>
    </main>
  );
}
