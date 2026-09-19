"use client";

import Form from "next/form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Suggestion } from "@/lib/movies";

type Option = { key: string; label: string; detail?: string; poster?: string | null; href?: string; action?: "search" | "ask" };

const ROLE_LABEL: Record<string, string> = {
  actor: "Actor", director: "Director", writer: "Writer", composer: "Composer", cinematographer: "Cinematographer", studio: "Studio",
};
const heading = (s: Suggestion) => (s.kind === "title" ? "Titles" : s.kind === "studio" ? "Studios" : "People");

// The search box: an ARIA combobox with autocomplete (titles, people, studios) and two submit buttons.
// Search goes to /search?q=...; Ask PopChoice adds &ask=1 (the second button's name/value).
export function AskForm({ defaultValue = "", recent = [], onNavigate, size = "lg" }: {
  defaultValue?: string; recent?: string[]; onNavigate?: () => void; size?: "lg" | "md";
}) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [found, setFound] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const formRef = useRef<HTMLFormElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);

  const q = value.trim();
  const typing = q.length >= 2;

  // Debounced autocomplete; a newer keystroke aborts the older request.
  useEffect(() => {
    if (!typing) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) { setFound(await res.json()); setActive(-1); }
      } catch { /* aborted or offline: keep the old list */ }
    }, 150);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, typing]);

  const options: Option[] = typing
    ? [
        ...found.map((s): Option => ({
          key: `${s.kind}:${s.label}`,
          label: s.label,
          detail: s.kind === "title" ? undefined : `${ROLE_LABEL[s.mainRole ?? ""] ?? "Studio"}, ${s.films} ${s.films === 1 ? "film" : "films"}`,
          poster: s.posterUrl,
          href: s.kind === "title" ? `/title/${s.movieId}` : `/name/${encodeURIComponent(s.label)}`,
        })),
        { key: "search", label: `Search for “${q}”`, action: "search" },
        { key: "ask", label: `Ask PopChoice about “${q}”`, action: "ask" },
      ]
    : recent.slice(0, 4).map((r): Option => ({ key: `r:${r}`, label: r, detail: "Recent search", href: `/search?q=${encodeURIComponent(r)}` }));
  const shown = open && options.length > 0;
  const groupOf = (i: number) => (typing && options[i].href ? heading(found[i]) : null);

  const choose = (o: Option) => {
    setOpen(false);
    if (o.action === "search") formRef.current?.requestSubmit();
    else if (o.action === "ask") formRef.current?.requestSubmit(askRef.current);
    else if (o.href) { onNavigate?.(); router.push(o.href); }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!options.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % options.length : (a - 1 + options.length) % options.length));
    } else if (e.key === "Enter" && shown && active >= 0) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape" && shown) {
      e.stopPropagation(); // close the list first; a second Esc closes the search dialog
      setOpen(false);
    }
  };

  const pad = size === "lg" ? "px-4 py-3 text-base" : "px-3 py-2 text-sm";
  return (
    <Form
      ref={formRef}
      action="/search"
      onSubmit={() => { setOpen(false); onNavigate?.(); }}
      className="relative"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          type="text"
          role="combobox"
          aria-label="Search films, people and studios, or describe a story"
          aria-expanded={shown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          required
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Titles, people, studios, or a story…"
          className={`${pad} min-w-0 flex-1 rounded-md bg-slate text-white placeholder:text-white/60`}
        />
        <div className="flex gap-2">
          <button type="submit" className={`${pad} flex-1 rounded-md bg-white/10 font-bold hover:bg-white/20 sm:flex-none`}>Search</button>
          <button ref={askRef} type="submit" name="ask" value="1" className={`${pad} flex-1 rounded-md bg-pop font-bold text-night hover:brightness-110 sm:flex-none`}>Ask PopChoice</button>
        </div>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!shown}
        className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-md bg-deep py-1 shadow-xl ring-1 ring-white/10 sm:right-auto sm:w-[min(100%,34rem)]"
      >
        {options.map((o, i) => (
          <li key={o.key} role="presentation">
            {groupOf(i) && groupOf(i) !== (i > 0 ? groupOf(i - 1) : null) && (
              <p className="px-3 pb-1 pt-2 text-xs font-bold text-white/60">{groupOf(i)}</p>
            )}
            <div
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${i === active ? "bg-slate" : "hover:bg-slate/60"} ${o.action ? "text-pop" : ""}`}
            >
              {o.poster && <Image src={o.poster} alt="" width={28} height={42} className="h-[42px] w-7 rounded object-cover" unoptimized />}
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.detail && <span className="shrink-0 text-xs text-white/60">{o.detail}</span>}
            </div>
          </li>
        ))}
      </ul>
    </Form>
  );
}
