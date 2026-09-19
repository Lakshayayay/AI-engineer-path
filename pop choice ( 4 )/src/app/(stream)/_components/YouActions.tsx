"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MovieCard } from "@/lib/movies";

// Films you like, each with a remove button. Removing sends "unrate" and refreshes the page.
export function LikedGrid({ movies }: { movies: MovieCard[] }) {
  const router = useRouter();
  const remove = async (movieId: number) => {
    await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "unrate", movieId }) });
    router.refresh();
  };
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4">
      {movies.map((m) => (
        <li key={m.id}>
          <Link href={`/title/${m.id}`} className="block">
            <span className="relative block aspect-[2/3] overflow-hidden rounded-md bg-slate/40">
              <Image src={m.posterUrl ?? "https://placehold.co/300x450/00072a/FFFFFF?text=No+Poster"} alt={`${m.title} poster`} fill sizes="150px" className="object-cover" unoptimized />
            </span>
            <span className="mt-1 line-clamp-1 block text-sm">{m.title}</span>
          </Link>
          <button type="button" onClick={() => remove(m.id)} aria-label={`Remove ${m.title} from films you like`} className="mt-1 text-xs text-white/70 underline underline-offset-4 hover:text-white">
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ClearHistory() {
  const router = useRouter();
  const clear = async () => {
    if (!confirm("Clear everything PopStream remembers about you in this browser?")) return;
    await fetch("/api/events", { method: "DELETE" });
    router.refresh();
  };
  return <button type="button" onClick={clear} className="rounded-md bg-white/10 px-4 py-2 font-bold hover:bg-white/20">Clear my history</button>;
}
