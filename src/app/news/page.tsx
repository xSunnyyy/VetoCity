"use client";

import { useMemo, useState } from "react";
import FloatingNav from "@/app/components/FloatingNav";
import { useNewsQuery, type NewsArticle, type NewsCategory } from "@/app/hooks/useNewsQuery";

type Filter = "all" | NewsCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fantasy", label: "Fantasy Analysis" },
  { key: "nfl", label: "NFL News" },
];

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0 || Number.isNaN(ms)) return "";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function LoadingSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)]"
        >
          <div className="aspect-video w-full bg-zinc-900/60 light:bg-zinc-200" />
          <div className="p-5">
            <div className="h-3 w-24 rounded bg-zinc-900/60 light:bg-zinc-100" />
            <div className="mt-4 h-4 w-full rounded bg-zinc-900/60 light:bg-zinc-100" />
            <div className="mt-2 h-4 w-2/3 rounded bg-zinc-900/60 light:bg-zinc-100" />
            <div className="mt-4 h-3 w-full rounded bg-zinc-900/40 light:bg-zinc-100" />
            <div className="mt-2 h-3 w-4/5 rounded bg-zinc-900/40 light:bg-zinc-100" />
          </div>
        </div>
      ))}
    </section>
  );
}

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-2xl border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)] transition hover:border-zinc-700 light:hover:border-zinc-400"
    >
      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="aspect-video w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 light:text-zinc-500">
          <span className="truncate">{article.source}</span>
          {article.publishedAt ? <span className="shrink-0">{timeAgo(article.publishedAt)}</span> : null}
        </div>
        <div className="mt-2 text-sm font-semibold leading-snug text-zinc-100 light:text-zinc-900 group-hover:text-white light:group-hover:text-zinc-950">
          {article.title}
        </div>
        {article.summary ? (
          <div className="mt-2 text-sm leading-relaxed text-zinc-400 light:text-zinc-600">{article.summary}</div>
        ) : null}
      </div>
    </a>
  );
}

export default function NewsPage() {
  const { data, isLoading, error } = useNewsQuery();
  const [filter, setFilter] = useState<Filter>("all");

  const articles = useMemo(() => {
    if (!data) return [];
    return filter === "all" ? data.articles : data.articles.filter((a) => a.category === filter);
  }, [data, filter]);

  const sourceNames = useMemo(() => {
    if (!data) return "";
    const ok = data.sources.filter((s) => s.ok).map((s) => s.name);
    return ok.join(", ");
  }, [data]);

  return (
    <main className="min-h-screen bg-zinc-950 light:bg-white text-zinc-100 light:text-zinc-900">
      <FloatingNav />

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 md:pt-24">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">News</h1>
          <div className="mt-2 text-sm text-zinc-400 light:text-zinc-600">
            {sourceNames
              ? `Fantasy football & NFL headlines from ${sourceNames}`
              : "Fantasy football & NFL headlines from around the web"}
          </div>
        </div>

        {data ? (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  filter === f.key
                    ? "border-red-700/60 bg-red-950/40 light:bg-red-100 text-red-100 light:text-red-800"
                    : "border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50 text-zinc-300 light:text-zinc-700 hover:bg-zinc-900/70 light:hover:bg-zinc-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-red-900/60 light:border-red-300 bg-zinc-950/60 light:bg-zinc-50 p-5 text-red-200 light:text-red-800 shadow-[0_14px_40px_rgba(0,0,0,0.42)] light:shadow-[0_14px_40px_rgba(0,0,0,0.10)]">
            <div className="text-sm font-semibold">Load error</div>
            <div className="mt-2 text-sm opacity-90">{error.message}</div>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/80 light:border-zinc-300 bg-zinc-950/60 light:bg-zinc-50 p-6 text-center text-sm text-zinc-400 light:text-zinc-600">
            No headlines in this category right now.
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
