"use client";

import { useState } from "react";
import Link from "next/link";
import { useOpportunities } from "@/lib/use-opportunities";
import { NotifBell } from "@/components/ui/notif-bell";

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "",        label: "Tous les types" },
  { value: "FACTURE", label: "Facture" },
  { value: "PRET",    label: "Prêt" },
  { value: "EQUITY",  label: "Equity" },
];

const CATEGORY_BADGE: Record<string, string> = {
  FACTURE: "bg-blue-100 text-blue-700",
  PRET:    "bg-green-100 text-green-700",
  EQUITY:  "bg-purple-100 text-purple-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Facture",
  PRET:    "Prêt",
  EQUITY:  "Equity",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtFull(v: string | number, currency = "F CFA") {
  return `${Number(v).toLocaleString("fr-FR")} ${currency}`;
}

function fmtDuration(months: number | null, category: string) {
  if (!months) return category === "EQUITY" ? "Long terme" : "—";
  if (category === "FACTURE") return `${months * 30} jours`;
  return `${months} mois`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ── filter icon ───────────────────────────────────────────────────────────────

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// ── opportunity card ──────────────────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: import("@/lib/use-opportunities").Opportunity }) {
  const badge   = CATEGORY_BADGE[opp.category]  ?? "bg-slate-100 text-slate-600";
  const label   = CATEGORY_LABELS[opp.category] ?? opp.category;
  const closeDate = fmtDate(opp.closesAt);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)]">

      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold text-slate-900">{opp.organization.legalName}</p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge}`}>
          {label}
        </span>
      </div>
      <p className="mb-4 text-[13px] font-medium text-green-600">{opp.title}</p>

      {/* Metrics */}
      <div className="mb-4 space-y-2 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Montant</span>
          <span className="text-[13px] font-bold text-slate-900">{fmtFull(opp.amountRequested, opp.currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Durée</span>
          <span className="text-[13px] font-bold text-slate-900">
            {fmtDuration(opp.durationMonths, opp.category)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Rendement</span>
          <span className="text-[13px] font-bold text-green-600">
            {opp.expectedReturn ? `${Number(opp.expectedReturn)}%` : "—"}
          </span>
        </div>
      </div>

      {/* Score de risque */}
      <div className="mb-4 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Score de risque</span>
          <span className="text-[12px] font-semibold text-slate-400">Non évalué</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-0 rounded-full bg-slate-300" />
        </div>
      </div>

      {/* Description + date */}
      <div className="mb-4 flex-1">
        <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500">{opp.description}</p>
        {closeDate && (
          <p className="mt-2 text-[11px] text-slate-400">Date limite : {closeDate}</p>
        )}
      </div>

      {/* CTA */}
      <Link
        href={`/investor/opportunites/${opp.id}`}
        className="flex items-center justify-center gap-2 rounded-[10px] bg-blue-700 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-800"
      >
        Analyser cette opportunité
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ExplorerPage() {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const { opportunities, isLoading } = useOpportunities({ category, search });

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Explorer les opportunités</p>
          <p className="text-xs text-slate-500">
            {isLoading
              ? "Recherche..."
              : `${opportunities.length} opportunité${opportunities.length !== 1 ? "s" : ""} disponible${opportunities.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <NotifBell />
      </header>

      <div className="p-8 pb-16">

        {/* Barre de filtres */}
        <div className="mb-6 flex items-center gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par entreprise ou titre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white pl-10 pr-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            />
          </div>

          {/* Filtre type */}
          <div className="relative flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 h-10">
            <FilterIcon />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="appearance-none bg-transparent pr-5 text-[13px] font-medium text-slate-700 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Filtre risque (cosmétique — module scoring à venir) */}
          <div className="relative flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 h-10">
            <FilterIcon />
            <select
              disabled
              className="appearance-none bg-transparent pr-5 text-[13px] font-medium text-slate-400 outline-none cursor-not-allowed"
            >
              <option>Tous les risques</option>
            </select>
            <svg className="pointer-events-none absolute right-2.5 text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Grille de cards */}
        <div className="grid grid-cols-3 gap-5">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            ))}

          {!isLoading && opportunities.length === 0 && (
            <div className="col-span-3 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-3">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-[14px] font-semibold text-slate-900">Aucune opportunité trouvée</p>
              <p className="mt-1 text-[13px] text-slate-500">Essayez d'autres filtres ou revenez plus tard.</p>
            </div>
          )}

          {!isLoading && opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))}
        </div>

      </div>
    </>
  );
}
