"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { AskForm } from "./AskForm";
import { TRY_QUERIES } from "./constants";

const OPEN_EVENT = "pc:open-search";

// Header magnifier / tab-bar button: asks the dialog (mounted once in the layout) to open.
export function OpenSearch({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-label="Search" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className={className}>
      {children}
    </button>
  );
}

// A native <dialog>: focus trap and Esc come free. Opens from the header, the tab bar, or the "/" key.
export function SearchDialog() {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const open = () => ref.current?.showModal();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable && !ref.current?.open) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener(OPEN_EVENT, open);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener(OPEN_EVENT, open); window.removeEventListener("keydown", onKey); };
  }, []);

  const close = () => ref.current?.close();
  return (
    <dialog
      ref={ref}
      aria-label="Search"
      onClick={(e) => { if (e.target === ref.current) close(); }}
      className="m-0 mx-auto mt-[8vh] w-[min(100%-2rem,40rem)] rounded-xl bg-night p-5 text-white shadow-2xl backdrop:bg-black/70"
    >
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="" width={36} height={39} />
        <h2 className="font-carter-one text-2xl">What do you feel like watching?</h2>
      </div>
      <div className="mt-4">
        <AskForm size="md" onNavigate={close} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {TRY_QUERIES.map((t) => (
          <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} onClick={close} className="rounded-full bg-slate px-3 py-1 text-xs hover:brightness-125">{t}</Link>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link href="/popchoice" onClick={close} className="text-white/80 underline underline-offset-4">Planning for a group? Take the quiz</Link>
        <button type="button" onClick={close} className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20">Close</button>
      </div>
    </dialog>
  );
}
