"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Recommendation } from "@/lib/recommend";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; pick: Recommendation }
  | { status: "error"; message: string };

// One AI pick with a written reason. Runs only when the user asks: the "Ask PopChoice" button (?ask=1)
// or "Pick one for me". Key this component by the query so a new search resets it.
export function PopChoicePick({ q, autoRun }: { q: string; autoRun: boolean }) {
  const [state, setState] = useState<State>({ status: autoRun ? "loading" : "idle" });
  const seen = useRef<number[]>([]); // "Another pick" never repeats
  const started = useRef(false);

  const run = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q, excludeIds: seen.current, personal: true }),
      });
      const json = await res.json();
      if (!res.ok) { setState({ status: "error", message: json.error ?? "Something went wrong finding your film." }); return; }
      seen.current = [...seen.current, json.id];
      setState({ status: "done", pick: json });
    } catch {
      setState({ status: "error", message: "Couldn't reach PopChoice." });
    }
  };

  useEffect(() => {
    if (!autoRun || started.current) return; // the ref stops dev StrictMode from asking twice
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panel = "mx-4 my-4 rounded-xl bg-deep p-4 md:mx-10 md:p-5";
  if (state.status === "idle") {
    return (
      <section className={`${panel} flex flex-wrap items-center justify-between gap-3`} aria-label="Ask PopChoice">
        <p className="text-sm text-white/80">Want one answer? PopChoice reads the plots and picks the best fit.</p>
        <button type="button" onClick={run} className="rounded-md bg-pop px-4 py-2 font-bold text-night hover:brightness-110">Pick one for me</button>
      </section>
    );
  }
  if (state.status === "loading") {
    return (
      <section className={`${panel} flex gap-4`} aria-live="polite" aria-busy="true" aria-label="Ask PopChoice">
        <div className="aspect-[2/3] w-[96px] shrink-0 animate-pulse rounded bg-slate/60" />
        <div className="flex-1 space-y-3">
          <p className="text-sm text-white/80">Reading the plots…</p>
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate/60" />
          <div className="h-4 w-full animate-pulse rounded bg-slate/60" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate/60" />
        </div>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section className={`${panel} flex flex-wrap items-center justify-between gap-3`} role="alert">
        <p className="text-sm">{state.message} Try loosening one detail, or search again.</p>
        <button type="button" onClick={run} className="rounded-md bg-white/10 px-4 py-2 font-bold hover:bg-white/20">Try again</button>
      </section>
    );
  }
  const { pick } = state;
  return (
    <section className={`${panel} flex gap-4`} aria-label="Ask PopChoice">
      <div className="relative aspect-[2/3] w-[96px] shrink-0 overflow-hidden rounded bg-slate/40 md:w-[130px]">
        <Image src={pick.posterUrl} alt={`${pick.title} poster`} fill sizes="130px" className="object-cover" unoptimized />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-butter">PopChoice picks</p>
        <h2 className="text-xl font-bold">{pick.title} <span className="font-normal text-white/50">({pick.year})</span></h2>
        <p className="mt-2 text-sm leading-relaxed text-white/90">{pick.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pick.watchable && <Link href={`/watch/${pick.id}`} className="rounded-md bg-pop px-4 py-2 text-sm font-bold text-night hover:brightness-110">Play free</Link>}
          <Link href={`/title/${pick.id}`} className="rounded-md bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">Details</Link>
          <button type="button" onClick={run} className="rounded-md bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">Another pick</button>
        </div>
      </div>
    </section>
  );
}
