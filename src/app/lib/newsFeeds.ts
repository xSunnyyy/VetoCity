import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

// Real fantasy football / NFL news, aggregated server-side from public RSS
// feeds run by the outlets themselves — no AI writing involved. FantasyPros
// and NFL.com don't publish a working public feed (their news is behind a
// JS-rendered page / partner API), so they're left out here rather than
// faked; everything below is a real, freely-accessible feed as of writing.

export type NewsCategory = "fantasy" | "nfl";

export interface NewsSource {
  id: string;
  name: string;
  siteUrl: string;
  feedUrl: string;
  category: NewsCategory;
  /** Drops items that clearly aren't NFL (some outlets share one general feed). */
  filter?: (title: string) => boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: string | null;
  source: string;
  sourceId: string;
  category: NewsCategory;
}

export interface NewsSourceStatus {
  id: string;
  name: string;
  siteUrl: string;
  category: NewsCategory;
  ok: boolean;
}

export interface NewsFeedResult {
  articles: NewsArticle[];
  sources: NewsSourceStatus[];
  fetchedAt: string;
}

const OTHER_SPORTS_RE =
  /\b(NBA|WNBA|MLB|NHL|PGA|LPGA|NASCAR|UFC|Formula 1|F1 |Premier League|La Liga|Champions League|Ryder Cup|Wimbledon|US Open Tennis|Olympics|March Madness|College Football Playoff|CFB Bottom)\b/i;

// Several outlets' "headlines" RSS feeds mix in sportsbook affiliate content
// (promo codes, bonus bet offers) alongside actual news — not journalism,
// so it's dropped from every source rather than allow-listed per outlet.
const SPORTSBOOK_PROMO_RE =
  /\b(promo code|bonus bet|risk-free bet|bet \$\d|sign-up bonus|sportsbook)\b/i;

const SOURCES: NewsSource[] = [
  {
    id: "espn",
    name: "ESPN",
    siteUrl: "https://www.espn.com/nfl/",
    feedUrl: "https://www.espn.com/espn/rss/nfl/news",
    category: "nfl",
    filter: (title) => !OTHER_SPORTS_RE.test(title),
  },
  {
    id: "yahoo",
    name: "Yahoo Sports",
    siteUrl: "https://sports.yahoo.com/nfl/",
    feedUrl: "https://sports.yahoo.com/nfl/rss.xml",
    category: "nfl",
  },
  {
    id: "cbssports",
    name: "CBS Sports",
    siteUrl: "https://www.cbssports.com/nfl/",
    feedUrl: "https://www.cbssports.com/rss/headlines/nfl/",
    category: "nfl",
  },
  {
    id: "pft",
    name: "Pro Football Talk (NBC)",
    siteUrl: "https://profootballtalk.nbcsports.com/",
    feedUrl: "https://profootballtalk.nbcsports.com/feed/",
    category: "nfl",
  },
  {
    id: "pff",
    name: "PFF",
    siteUrl: "https://www.pff.com/news",
    feedUrl: "https://www.pff.com/feed",
    category: "fantasy",
  },
  {
    id: "rotoballer",
    name: "RotoBaller",
    siteUrl: "https://www.rotoballer.com/",
    feedUrl: "https://www.rotoballer.com/feed",
    category: "fantasy",
  },
];

const PER_SOURCE_LIMIT = 15;
const TOTAL_LIMIT = 60;
const FETCH_TIMEOUT_MS = 8000;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  textNodeName: "#text",
});

/** RSS text nodes come as a plain string, `{ "#text": ... }`, or `{ __cdata: ... }`. */
function textOf(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.__cdata === "string") return obj.__cdata;
    if (typeof obj["#text"] === "string") return obj["#text"];
  }
  return "";
}

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(str: string): string {
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITY_MAP[entity] ?? whole;
  });
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
}

function firstImgSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function extractImage(item: Record<string, unknown>, rawHtmlBlobs: string[]): string | null {
  const enclosure = item.enclosure as Record<string, unknown> | undefined;
  const enclosureUrl = enclosure?.["@_url"];
  const enclosureType = enclosure?.["@_type"];
  if (typeof enclosureUrl === "string" && (!enclosureType || String(enclosureType).startsWith("image"))) {
    return enclosureUrl;
  }

  const media = (item["media:content"] ?? item["media:thumbnail"]) as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  const mediaNode = Array.isArray(media) ? media[0] : media;
  const mediaUrl = mediaNode?.["@_url"];
  if (typeof mediaUrl === "string") return mediaUrl;

  for (const blob of rawHtmlBlobs) {
    const found = firstImgSrc(blob);
    if (found) return found;
  }
  return null;
}

function parseDate(pubDate: string): string | null {
  if (!pubDate) return null;
  const d = new Date(pubDate);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function idFor(link: string): string {
  return createHash("sha1").update(link).digest("hex").slice(0, 16);
}

async function fetchFeedXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "VetoCityNewsBot/1.0 (+https://vetocity.app)" },
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSource(source: NewsSource): Promise<{ articles: NewsArticle[]; ok: boolean }> {
  try {
    const xml = await fetchFeedXml(source.feedUrl);
    const parsed = xmlParser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
    const items: Record<string, unknown>[] = Array.isArray(rawItems) ? rawItems : [rawItems];

    const articles: NewsArticle[] = [];
    for (const item of items) {
      const title = stripHtml(textOf(item.title));
      const link = textOf(item.link) || (item.link as Record<string, unknown>)?.["@_href"];
      if (!title || !link || typeof link !== "string") continue;
      if (SPORTSBOOK_PROMO_RE.test(title)) continue;
      if (source.filter && !source.filter(title)) continue;

      const descriptionHtml = textOf(item.description) || textOf(item.summary);
      const contentHtml = textOf(item["content:encoded"]) || textOf(item.content);

      articles.push({
        id: idFor(link),
        title,
        link,
        summary: truncate(stripHtml(descriptionHtml || contentHtml), 220),
        imageUrl: extractImage(item, [contentHtml, descriptionHtml]),
        publishedAt: parseDate(textOf(item.pubDate) || textOf(item.published) || textOf(item.updated)),
        source: source.name,
        sourceId: source.id,
        category: source.category,
      });

      if (articles.length >= PER_SOURCE_LIMIT) break;
    }

    return { articles, ok: true };
  } catch {
    return { articles: [], ok: false };
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getAllNews(): Promise<NewsFeedResult> {
  const results = await Promise.all(SOURCES.map((source) => fetchSource(source)));

  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const merged: NewsArticle[] = [];
  for (const { articles } of results) {
    for (const article of articles) {
      if (seenLinks.has(article.link)) continue;
      // Wire-service stories often run near-verbatim on multiple outlets;
      // keep only the first one encountered rather than showing duplicates.
      const normalized = normalizeTitle(article.title);
      if (seenTitles.has(normalized)) continue;
      seenLinks.add(article.link);
      seenTitles.add(normalized);
      merged.push(article);
    }
  }

  merged.sort((a, b) => {
    const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bt - at;
  });

  const sources: NewsSourceStatus[] = SOURCES.map((source, i) => ({
    id: source.id,
    name: source.name,
    siteUrl: source.siteUrl,
    category: source.category,
    ok: results[i].ok,
  }));

  return {
    articles: merged.slice(0, TOTAL_LIMIT),
    sources,
    fetchedAt: new Date().toISOString(),
  };
}
