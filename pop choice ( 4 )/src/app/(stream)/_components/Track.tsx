"use client";

import { useEffect, useRef } from "react";

// Side effect only: records a play (watch page) or a search with its result ids (search page).
export function Track(props: { kind: "play"; movieId: number } | { kind: "search"; query: string; resultIds: number[] }) {
  const sent = useRef(false);
  const body = JSON.stringify(props);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [body]);
  return null;
}
