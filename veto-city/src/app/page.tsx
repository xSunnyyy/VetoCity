import Link from "next/link";
import FloatingNav from "@/app/components/FloatingNav";
import { DashboardCards } from "./components/DashboardCards";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <FloatingNav />

      <div className="mx-auto max-w-6xl px-4 py-10">

        {/* Centered title + CTA (no banner box) */}
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Veto City</h1>
          <div className="mt-4 flex justify-center">
            <Link
              href="/league/drafts"
              className="inline-flex h-10 items-center justify-center rounded-none border border-zinc-800 bg-zinc-900 px-5 text-sm font-medium hover:bg-zinc-800"
            >
              View the Draft
            </Link>
          </div>
        </section>

        <DashboardCards />
      </div>
    </main>
  );
}
