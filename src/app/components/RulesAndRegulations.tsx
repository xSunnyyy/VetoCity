type BylawItem = string | { label: string; sub: string[] };
type BylawSection = { number: number; title: string; items: BylawItem[] };

const SECTIONS: BylawSection[] = [
  {
    number: 1,
    title: "League",
    items: [
      "League fee: $50.",
      "No more mandatory $50 (last year was the final mandatory period) — majority voted to keep it at $50 this year as well. The only way to increase the fee is a unanimous league vote.",
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
      "Trades will be instant.",
      "ONLY trades which are clear collusion will be vetoed by the commissioner.",
      "FAAB can now be traded.",
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
        sub: ["Sacko punishment: Sacko pays $200.00, which will be used as voted upon."],
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

function BylawList({ items }: { items: BylawItem[] }) {
  return (
    <ul className="space-y-2">
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
            <div className="flex gap-2.5 text-sm font-medium leading-relaxed text-zinc-200">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
              <span>{item.label}</span>
            </div>
            <ul className="ml-3.5 mt-1.5 space-y-1.5 border-l border-zinc-800/70 pl-4">
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

export function RulesAndRegulations() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur">
      <div className="border-b border-zinc-800/70 bg-zinc-900/40 px-5 py-4 text-center">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">Rules &amp; Regulations</div>
      </div>

      <div>
        {SECTIONS.map((s) => (
          <div key={s.number} className="border-b border-zinc-800/60 px-5 py-4 last:border-b-0">
            <div className="mb-3 text-sm font-semibold text-zinc-100">
              {s.number}. {s.title}
            </div>
            <BylawList items={s.items} />
          </div>
        ))}
      </div>
    </div>
  );
}
