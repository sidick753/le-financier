"use client";

import { useEffect, useId, useRef, useState } from "react";

// Petite icône (i) posée à côté d'un label technique : au clic (ou survol
// desktop), affiche une explication courte en langage simple. Le texte vient
// idéalement de src/lib/financial-glossary.ts pour rester cohérent avec la
// page publique /glossaire.
export function InfoTooltip({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!text) return null;

  return (
    <span ref={wrapperRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        aria-label="Plus d'informations sur ce terme"
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[9px] font-bold leading-none text-slate-400 transition hover:border-blue-500 hover:text-blue-600"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-normal normal-case leading-snug text-white shadow-lg"
        >
          {text}
          <span className="absolute bottom-full left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1 rotate-45 bg-slate-900" />
        </span>
      )}
    </span>
  );
}
