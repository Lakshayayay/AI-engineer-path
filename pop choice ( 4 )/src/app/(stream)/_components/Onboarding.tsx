"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MovieCard } from "@/lib/movies";

const NEEDED = 3;

// First visit: pick a few films you love, and the home page re-orders around your taste.
export function Onboarding({ movies }: { movies: MovieCard[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const skip = () => {
    document.cookie = "pc_onboarded=1; path=/; max-age=31536000; samesite=lax";
    router.refresh();
  };
  const show = async () => {
    setBusy(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "like", movieIds: picked }),
    }).catch(() => {});
    router.refresh();
    setBusy(false);
  };

  return (
    <section aria-labelledby="onboard-title" className="mx-4 my-4 rounded-xl bg-deep p-4 md:mx-10 md:p-6">
      <h2 id="onboard-title" className="text-lg font-bold">Pick a few films you love</h2>
      <p className="mt-1 text-sm text-white/70">Choose at least {NEEDED} and your home screen will be built around your taste.</p>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {movies.map((m) => {
          const on = picked.includes(m.id);
          return (
            <button key={m.id} type="button" aria-pressed={on} onClick={() => toggle(m.id)} className="group text-left">
              <span className={`relative block aspect-[2/3] overflow-hidden rounded-md ring-2 ${on ? "ring-pop" : "ring-transparent"}`}>
                <Image src={m.posterUrl ?? "https://placehold.co/300x450/00072a/FFFFFF?text=No+Poster"} alt="" fill sizes="150px" className="object-cover" unoptimized />
                {on && <span aria-hidden className="absolute right-1 top-1 rounded-full bg-pop px-1.5 text-sm font-bold text-night">✓</span>}
              </span>
              <span className="mt-1 line-clamp-1 block text-xs text-white/80">{m.title}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={picked.length < NEEDED || busy} onClick={show} className="rounded-md bg-pop px-4 py-2 font-bold text-night hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          Show my picks
        </button>
        <button type="button" onClick={skip} className="rounded-md px-3 py-2 text-sm text-white/80 underline underline-offset-4 hover:text-white">Skip for now</button>
        <span className="text-sm text-white/70" aria-live="polite">{Math.min(picked.length, NEEDED)} of {NEEDED} picked</span>
      </div>
    </section>
  );
}
