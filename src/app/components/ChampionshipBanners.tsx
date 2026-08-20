"use client";

import { useEffect, useMemo, useState } from "react";
import { useDragScroll } from "@/app/lib/useDragScroll";

type ChampionRecord = { wins: number; losses: number; ties: number } | null;

type Winner = {
  rosterId: number | null;
  name: string;
  avatar: string | null;
  record: ChampionRecord;
};

type SeasonAwards = {
  season: string;
  champion: Winner;
};

type AwardsPayload = {
  seasons: SeasonAwards[];
  error?: string;
};

function recordStr(r: ChampionRecord) {
  if (!r) return null;
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;
}

function Banner({
  season,
  name,
  record,
  tilt,
}: {
  season: string;
  name: string;
  record: string | null;
  tilt: "left" | "right";
}) {
  return (
    <div className="relative flex shrink-0 flex-col items-center" style={{ width: 168 }}>
      {/* ring hanging on the rafter */}
      <div className="-mt-[7px] h-3.5 w-3.5 rounded-full border-2 border-zinc-500 bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
      {/* strap */}
      <div className="h-5 w-[2px] bg-zinc-600/70" />

      <div
        className={
          "relative w-full origin-top text-center transition-transform duration-300 ease-out hover:rotate-0 hover:scale-[1.03] " +
          (tilt === "left" ? "-rotate-1" : "rotate-1")
        }
      >
        {/* banner body — text lives here, never clipped */}
        <div className="relative overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950 px-3 pb-4 pt-5 shadow-[0_18px_34px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-red-500/30">
          {/* subtle cloth ridges */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 9px)",
            }}
          />
          {/* top trim */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-700/70 via-red-400/90 to-red-700/70" />

          <div className="relative">
            <div className="text-lg leading-none">🏆</div>
            <div className="mt-1.5 text-[10px] font-bold tracking-[0.22em] text-red-400">
              CHAMPIONS
            </div>
            <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-zinc-50">
              {name}
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-zinc-100">{season}</div>
            <div
              className={
                "mt-2 inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-300" +
                (record ? "" : " invisible")
              }
            >
              {record || "—"}
            </div>
          </div>
        </div>

        {/* pennant tail — purely decorative, can never eat into text */}
        <div
          className="h-6 w-full bg-zinc-950 ring-1 ring-inset ring-red-500/30"
          style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 40%, 0% 100%)" }}
        />
      </div>
    </div>
  );
}

export function ChampionshipBanners() {
  const [seasons, setSeasons] = useState<SeasonAwards[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/awards", { cache: "no-store" });
        const json = (await res.json()) as AwardsPayload;

        if (!res.ok || (json as any).error) {
          throw new Error((json as any).error || `API error ${res.status}`);
        }

        if (alive) setSeasons(json.seasons);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load championship banners.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const champions = useMemo(() => {
    return (seasons ?? [])
      .filter((s) => s.champion?.rosterId != null)
      .sort((a, b) => Number(b.season) - Number(a.season));
  }, [seasons]);

  const scrollerRef = useDragScroll<HTMLDivElement>();

  if (err || (!loading && !champions.length)) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Championship Banners
      </div>

      <div ref={scrollerRef} className="no-scrollbar cursor-grab overflow-x-auto pb-4">
        <div className="mx-auto flex w-max items-start gap-7 border-t-[3px] border-zinc-700/80 px-6 pt-0">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex shrink-0 flex-col items-center" style={{ width: 168 }}>
                  <div className="-mt-[7px] h-3.5 w-3.5 rounded-full border-2 border-zinc-700 bg-zinc-800" />
                  <div className="h-5 w-[2px] bg-zinc-700/70" />
                  <div
                    className="h-[170px] w-full animate-pulse bg-zinc-900/50"
                    style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 88%, 50% 74%, 0% 88%)" }}
                  />
                </div>
              ))
            : champions.map((s, i) => (
                <Banner
                  key={s.season}
                  season={s.season}
                  name={s.champion.name}
                  record={recordStr(s.champion.record)}
                  tilt={i % 2 === 0 ? "left" : "right"}
                />
              ))}
        </div>
      </div>
    </section>
  );
}
