"use client";

import { useState } from "react";

type BylawItem = string | { label: string; sub: string[] };
type BylawSection = { number: number; title: string; items: BylawItem[] };

const SECTIONS: BylawSection[] = [
  {
    number: 1,
    title: "League",
    items: [
      "League is on Sleeper.",
      "League fee: $50.",
      "No more mandatory $50 (last year was the final mandatory period) — majority voted to keep it at $50 this year as well. The only way to increase the fee is a unanimous league vote.",
      {
        label: "Lineup Settings",
        sub: [
          "1/2 PPR",
          "Weekly lineup: 1 QB, 2 RB, 2 WR, 1 TE, 2 WR/RB/TE",
          "2022 — Defense removed. 2023 — agreed to continue without DEF/K.",
          "No IR spot",
          "6 bench spots",
        ],
      },
    ],
  },
  {
    number: 2,
    title: "Draft",
    items: [
      "Online draft.",
      "90 seconds per pick.",
      "Not inputting a pick within the allocated time results in the Commissioner selecting the best available from his list for you.",
    ],
  },
  {
    number: 3,
    title: "Trades",
    items: [
      {
        label: "Draft Picks",
        sub: [
          "Before the draft, picks can be swapped.",
          "Can not trade your 1st round pick for another's 2nd and 4th round, for example — only swaps of like round-for-round are allowed.",
        ],
      },
      "Player trades do not require a league vote to pass.",
      "Accepted trades require a 24hr waiting period before the commissioner approves the trade (if NFL settings can be set to a 1-day waiting period, no commissioner approval is needed).",
      "If the commissioner needs to approve the trade, parties involved are asked to tag the commissioner in the league chat.",
      "Only if Sunny is busy, Mizan will be responsible for approving trades.",
      "Trades will be instant.",
      "ONLY trades which are clear collusion will be vetoed by the commissioner.",
      "FAAB can now be traded — effective 9/9/23.",
      "A player traded cannot be traded for again during the season. Can be picked up from waivers, if available, during the season.",
    ],
  },
  {
    number: 4,
    title: "Sacko",
    items: [
      "11th and 12th place will play each other 3 weeks straight (weeks 15, 16, and 17) only if the record is tied.",
      "Best of 3 — loser will be crowned the league Sacko.",
      {
        label: "Punishment",
        sub: ["2023 Sacko punishment: Sacko pays $200.00, which will be used for next year's league swag."],
      },
    ],
  },
  {
    number: 5,
    title: "Champion",
    items: [
      { label: "Payout", sub: ["1st Place — $300.00"] },
      { label: "League Dinner", sub: ["$300 is allocated for a league dinner/hangout where the new champion is crowned."] },
      {
        label: "League Trophy",
        sub: [
          "Held by the champion of the previous year until a new champion is crowned.",
          "Standard name plates are added for new champions — name and year only.",
        ],
      },
    ],
  },
  {
    number: 6,
    title: "Veto City Committee",
    items: [
      "Sunny will assign a few league members as part of the league committee, where any decisions the commissioner needs input on, he will reach out to the committee.",
      "The committee is also there to make sure the commissioner does not exceed his authority.",
    ],
  },
  {
    number: 7,
    title: "Miscellaneous",
    items: [
      {
        label: "Leaving the league group chat and/or league",
        sub: [
          "If you leave due to fantasy talk, then you are removed from the league — if not, the league members will revisit the situation.",
          "When a person quits mid-season, the commissioner will set up the person's lineup based on NFL rankings. If the commissioner is playing the person who quits, then another member in the league will set the lineup.",
        ],
      },
    ],
  },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function BylawList({ items }: { items: BylawItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => {
        if (typeof item === "string") {
          return (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
              <span>{item}</span>
            </li>
          );
        }

        return (
          <li key={i}>
            <div className="flex gap-2.5 text-sm font-semibold leading-relaxed text-zinc-100">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-500/70" />
              <span>{item.label}</span>
            </div>
            <ul className="ml-3.5 mt-2 space-y-2 border-l border-zinc-800/70 pl-4">
              {item.sub.map((s, j) => (
                <li key={j} className="text-sm leading-relaxed text-zinc-400">
                  {s}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function BylawCard({ section, defaultOpen }: { section: BylawSection; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-800/50 bg-red-950/30 text-sm font-bold text-red-300">
            {section.number}
          </div>
          <div className="text-sm font-semibold tracking-wide text-zinc-100">{section.title}</div>
        </div>

        <div
          className={cx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/60 text-zinc-400 transition",
            open ? "rotate-180" : "rotate-0"
          )}
          aria-hidden
        >
          ▾
        </div>
      </button>

      <div className={cx("px-5 pb-5", open ? "block" : "hidden")}>
        <BylawList items={section.items} />
      </div>
    </div>
  );
}

export function RulesAndRegulations() {
  return (
    <div className="mt-6">
      <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Rules &amp; Regulations
      </div>

      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <BylawCard key={s.number} section={s} defaultOpen={s.number === 1} />
        ))}
      </div>
    </div>
  );
}
