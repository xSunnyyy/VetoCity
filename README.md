# VetoCity

A fantasy football league website for a [Sleeper](https://sleeper.com) league — dashboard, rules, managers, standings, records, awards, and more, all pulled live from the Sleeper API. Built with Next.js (App Router) and Tailwind CSS.

This repo is a **GitHub template**: click "Use this template" to spin up a site for your own league. This README covers everything you need to configure it, deploy it to Vercel, and understand the gotchas we ran into along the way.

---

## 1. Project structure

The Next.js app lives directly at the repo root:

```
VetoCity/
├── README.md                  ← you are here
├── data/
│   └── billys-report.json     ← Billy's Report data (see §6)
├── package.json
├── public/
│   └── manifest.json          ← PWA name/icons/shortcuts (see §4)
└── src/app/
    ├── layout.tsx              ← page <title>, meta description, and other <head> tags (see §4)
    ├── lib/vetocity.ts         ← LEAGUE_ID lives here (§2)
    ├── page.tsx                ← homepage / dashboard
    ├── rules/page.tsx          ← "League Rules" page
    ├── movement/page.tsx       ← waivers / trades / power rankings
    ├── league/                 ← rosters, managers, rivalry, standings,
    │                             drafts, awards, records, Billy's Report
    ├── components/             ← shared UI (nav, banners, dashboard sections)
    └── api/                    ← server routes that call the Sleeper API
```

All `npm` commands run from the repo root — no subfolder to `cd` into.

---

## 2. Quick start

```bash
git clone <your-fork-url>
cd VetoCity
npm install
npm run dev
```

The site defaults to VetoCity's own league. To point it at **your** league, there's exactly one required change:

**`src/app/lib/vetocity.ts`**

```ts
export const LEAGUE_ID = "YOUR_SLEEPER_LEAGUE_ID";
export const SLEEPER_BASE = "https://api.sleeper.app/v1";
```

**Finding your league ID:** open your league in the Sleeper app or sleeper.com — the numeric ID is in the URL (`sleeper.com/leagues/<LEAGUE_ID>/...`). Every API route in this app reads from that one constant, and the app automatically walks backward through your league's full history via Sleeper's `previous_league_id` chaining — so Records, Awards, Managers, and Standings' season selector all populate themselves from every past season your league has played, with zero extra config.

---

## 3. The season-rollover gotcha (read this every August)

**Sleeper creates a brand-new `league_id` every season.** When a commissioner clicks "Continue to New Season" (or Sleeper does it automatically), the old league becomes a frozen, read-only historical record, and a *new* league is created for the upcoming season — linked back to the old one via `previous_league_id`, but with its own distinct ID.

This app's `LEAGUE_ID` constant always has to point at the **current** season's league, not last year's. If you forget to update it after your season rolls over, the site keeps working — it just silently shows **stale data**: last year's bench/roster settings, last year's draft date, last year's trade deadline, etc., even though everything looks fine at a glance. This bit us directly: VetoCity's bench count was showing 5 instead of 6, and the draft date was wrong, purely because `LEAGUE_ID` was still pointed at the completed prior season.

**Fix it each year:**

1. Find your new league ID. Sleeper doesn't expose a "next season" link on the old league, so the easiest way is the Sleeper API using any league member's `user_id`:
   ```
   https://api.sleeper.app/v1/user/<user_id>/leagues/nfl/<new_season_year>
   ```
   Look for the league with your league's name in the response and grab its `league_id`. (You can get a `user_id` from `https://api.sleeper.app/v1/league/<old_league_id>/users`.)
2. Update `LEAGUE_ID` in `src/app/lib/vetocity.ts` to the new value.
3. Deploy. Historical seasons keep working automatically since the chain now starts one link further along.

---

## 4. Changing text, titles, and meta tags

The league name/branding shows up in a few different places, since browser tabs, search results, and "Add to Home Screen" each read from a different spot:

| What | Where | Notes |
|---|---|---|
| Browser tab title, meta description, Apple "web app" title, favicon/icons | `src/app/layout.tsx` — the exported `metadata` object | This drives the `<title>` and `<meta name="description">` tags Next.js renders into `<head>` for every page |
| Theme color (browser chrome / status bar tint) | `src/app/layout.tsx` — the exported `viewport` object | `themeColor` |
| Homepage hero logo (the big mark under the nav) | `src/app/page.tsx` renders `public/veto-city-logo.png` | Not a meta tag — this is what visitors actually see, separate from the browser tab title. Swap in your own transparent-background PNG at that path (or point the `<Image>` `src` at a new filename), and adjust its `width`/`height` props to match your image's actual pixel dimensions so it doesn't stretch |
| PWA name, short name, description, theme/background color, home-screen icons, "Add to Home Screen" shortcuts | `public/manifest.json` | Used when someone installs the site as an app on their phone. The `shortcuts` array are the quick actions that show up on a long-press of the home screen icon — keep their `url`s pointed at real routes (we found one still pointing at a page that had been removed) |
| Favicon file itself | `src/app/favicon.ico` | Next.js auto-serves this from the `app/` directory by convention |
| Home-screen icon images | `public/icon-192.png`, `public/icon-512.png` | Referenced by both `layout.tsx` metadata and `manifest.json` — replace the files themselves to change the artwork |

There's no Open Graph / Twitter card image configured by default — if you want a custom preview image for links shared in Slack/Discord/iMessage, add an `openGraph` block to the `metadata` export in `layout.tsx`.

---

## 5. Deploying to Vercel

1. Import the repo into Vercel.
2. Root Directory can be left blank/default — the app lives at the repo root.
3. If you're keeping the Billy's Report feature (see §6), add a `GITHUB_TOKEN` environment variable — details below.
4. Deploy. Vercel auto-deploys `main` to production and every other branch as a preview.

### Why Billy's Report needs its own storage story

Vercel's serverless functions have **no persistent disk** — writing a plain JSON file to disk works fine in `next dev` but silently vanishes on Vercel between deploys (and even between invocations; only `/tmp` exists, and it's ephemeral). A "just write a file" approach for any feature that needs to remember user input will not survive on Vercel.

The fix, in `src/app/lib/githubStore.ts`: instead of writing to local disk, Billy's Report entries are read and written as a JSON file **committed directly to this GitHub repo** via the GitHub Contents API (`data/billys-report.json` at the repo root). That makes the data genuinely permanent, shared identically by every visitor regardless of which serverless instance served the request, and it works the same in local dev as it does in production.

**Setup required — a `GITHUB_TOKEN` env var:**

1. GitHub → your profile → **Settings → Developer settings → Personal access tokens**.
2. Easiest path — **classic token**: "Generate new token (classic)", check the single **`repo`** scope, no per-permission fiddling.
   Alternative — **fine-grained token** (more restrictive, expires after at most 1 year so you'll need to rotate it): scope it to just this repo, and under **Repository permissions** set **Contents → Read and write**. (`Metadata: Read-only` gets added automatically — leave it. Do **not** grant `Administration` — that's for repo settings/collaborators/deletion, not file contents, and it's far more access than this needs.)
3. Copy the token immediately — GitHub only shows it once.
4. Vercel → your project → **Settings → Environment Variables** → add `GITHUB_TOKEN` with that value, scoped to Production (and Preview too, if you want preview deployments able to save reports).
5. Redeploy — env var changes don't apply to a deployment that's already live.

`githubStore.ts` writes to whichever branch matches Vercel's `VERCEL_GIT_COMMIT_REF` (so each preview deployment reads/writes its own branch's copy of the data file), or you can pin it explicitly with a `REPORTS_BRANCH` env var. It falls back to `main` if neither is set.

**Don't want Billy's Report at all?** It's fully self-contained and safe to delete:
- `src/app/league/billys-report/`
- `src/app/api/billys-report/`
- `src/app/lib/githubStore.ts`
- `data/billys-report.json`
- Remove the `{ label: "Billy's Report", ... }` entry from `secondaryItems` in `src/app/components/FloatingNav.tsx`

No `GITHUB_TOKEN` needed if you do this.

---

## 6. What's generic vs. what's VetoCity-specific

Everything under `src/app/api/` and most of `src/app/components/` computes entirely from live Sleeper data — no per-league editing needed beyond `LEAGUE_ID`. A few things are hand-written for VetoCity specifically and should be reviewed/replaced if you're standing up a different league:

| What | Where | Why it's league-specific |
|---|---|---|
| Hero logo | `public/veto-city-logo.png`, referenced in `src/app/page.tsx` | An image, not text — swap the file for your own league's logo |
| Bylaws / league rules prose | `src/app/components/RulesAndRegulations.tsx` | Hardcoded text (fees, trade rules, Sacko punishment, payout structure) — this is VetoCity's actual governance, not derived from Sleeper. Rewrite the `SECTIONS` array for your own league's rules, or delete the component and its usage in `src/app/rules/page.tsx` if you don't want this section |
| Billy's Report | see §5 | An optional weekly-recap feature some leagues won't want; delete cleanly per the instructions above if not needed |
| Championship banner / accent color (red) | `src/app/components/ChampionshipBanners.tsx` and the `red-*` Tailwind classes sprinkled through the dashboard components | Cosmetic — recolor to taste |
| Meta tags, PWA name, hero logo | see §4 | Every mention of "Veto City" across `layout.tsx` and `manifest.json`, plus the `public/veto-city-logo.png` image referenced in `page.tsx` |

Everything else — Rosters, Managers, Standings (with season navigation), Rivalry, Drafts, Awards, Records, Movement, the Rules page's Format/Roster/Scoring tables — reads Sleeper's API directly and needs no per-league content edits.

---

## 7. Forking this template for a new league

GitHub's "Use this template" button creates a **completely new, disconnected git history** — the new repo has no relationship to this one that Git or GitHub tracks. There's no automatic sync in either direction.

**Setting up a new league site:**
1. Click "Use this template" (or "Generate" if using the GitHub CLI) to create your new repo.
2. Clone it, update `LEAGUE_ID` (§2), update the hero title and any of the VetoCity-specific content in §4/§6.
3. Deploy to Vercel (§5).

**Pulling future VetoCity improvements into an already-forked league site:** since there's no git link between the repos, this has to be done by hand — diff the two repos' files and port over what applies, skipping anything VetoCity-specific per §6. If you're working with an AI coding assistant, the simplest approach is to give it push access to both repositories in the same session and ask it to port a specific set of changes over — that's how updates have been synced to sibling league sites built from this template so far.

Note: sibling sites forked before this repo's structure was flattened (§1) still have their app nested inside a `veto-city/` subfolder — that's a difference in repo layout only, not behavior, and doesn't need to be "fixed" unless you want the same flattened layout there too.

---

## 8. Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build — good sanity check before deploying
npm run lint
```

No `.env` file is required for local dev unless you're testing Billy's Report, in which case you need `GITHUB_TOKEN` set locally too (a `.env.local` file at the repo root works, since Next.js loads it automatically and it's gitignored).
