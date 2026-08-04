"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { GLOSSARY, glossaryByCategory } from "@/lib/financial-glossary";

export default function GlossairePage() {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = glossaryByCategory();
    if (!q) return all;
    return all
      .map((g) => ({
        category: g.category,
        terms: g.terms.filter(
          (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.terms.length > 0);
  }, [search]);

  const resultCount = groups.reduce((n, g) => n + g.terms.length, 0);

  return (
    <>
      <Navbar />

      {/* ══ HERO ══ */}
      <section
        className="py-16 text-center text-white"
        style={{ background: "linear-gradient(120deg,#1a3fb5 0%,#1d4ed8 45%,#2563eb 100%)" }}
      >
        <div className="mx-auto w-full max-w-[720px] px-5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h1 className="text-[clamp(26px,4vw,38px)] font-semibold tracking-[-0.03em]">Glossaire financier</h1>
          <p className="mt-3 text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            Les termes financiers de la plateforme expliqués simplement, sans jargon
          </p>

          <div className="relative mx-auto mt-7 max-w-[480px]">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un terme (ex : DSCR, affacturage, KYC...)"
              className="h-12 w-full rounded-[10px] border-0 bg-white pl-10 pr-4 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-white/60"
            />
          </div>
        </div>
      </section>

      {/* ══ GLOSSAIRE ══ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto w-full max-w-[820px] px-5">
          {search.trim() && (
            <p className="mb-6 text-sm text-slate-500">
              {resultCount} résultat{resultCount !== 1 ? "s" : ""} pour « {search.trim()} »
            </p>
          )}

          {groups.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
              <p className="text-[15px] font-semibold text-slate-900">Aucun terme trouvé</p>
              <p className="mt-1 text-sm text-slate-500">Essayez un autre mot-clé, ou contactez-nous si un terme manque.</p>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.category} className="mb-12">
              <h2 className="mb-6 text-2xl font-bold text-slate-900">{g.category}</h2>
              <div className="flex flex-col gap-4">
                {g.terms.map((t) => (
                  <div key={t.id} id={t.id} className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-6">
                    <p className="text-sm font-semibold text-slate-900">{t.term}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{t.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ══ CTA ══ */}
          <div className="rounded-xl border-2 border-blue-700 bg-gradient-to-br from-blue-50 to-white p-8 text-center">
            <h3 className="mb-2 text-xl font-bold text-slate-900">Un terme ne figure pas ici ?</h3>
            <p className="mb-6 text-slate-500">Notre équipe support peut vous éclairer sur n&apos;importe quel terme de votre dossier</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="mailto:support@lefinancier.com"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-900"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Contacter le support
              </a>
              <Link
                href="/faq"
                className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-gray-50"
              >
                Voir la FAQ
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            {GLOSSARY.length} termes référencés
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
