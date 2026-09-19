"use client";

import { useState } from "react";

type Rating = "like" | "dislike" | null;

// I like this / Not for me. Optimistic: the button flips at once and the event is sent in the background.
export function TasteButtons({ movieId, initial }: { movieId: number; initial: Rating }) {
  const [rating, setRating] = useState<Rating>(initial);
  const [failed, setFailed] = useState(false);

  const rate = async (next: "like" | "dislike") => {
    const prev = rating;
    const target: Rating = prev === next ? null : next;
    setRating(target);
    setFailed(false);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: target ?? "unrate", movieId }),
    }).catch(() => null);
    if (!res?.ok) { setRating(prev); setFailed(true); }
  };

  const btn = (on: boolean) => `rounded-md px-4 py-2 text-sm font-bold ${on ? "bg-butter text-night" : "bg-white/10 hover:bg-white/20"}`;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={rating === "like"} onClick={() => rate("like")} className={btn(rating === "like")}>I like this</button>
        <button type="button" aria-pressed={rating === "dislike"} onClick={() => rate("dislike")} className={btn(rating === "dislike")}>Not for me</button>
      </div>
      <p className="mt-2 min-h-5 text-sm text-white/70" aria-live="polite">
        {failed ? "Couldn't save that. Try again." : rating === "like" ? "Added to your taste. Your home will show more like this." : rating === "dislike" ? "Noted. We'll show fewer films like this." : ""}
      </p>
    </div>
  );
}
