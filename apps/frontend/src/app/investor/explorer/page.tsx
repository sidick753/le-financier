"use client";

import { useState } from "react";
import Link from "next/link";
import { useOpportunities } from "@/lib/use-opportunities";
import { GRADE_CLASSNAMES } from "@/lib/use-institution-data";
import { NotifBell } from "@/components/ui/notif-bell";

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "",        label: "Tous les types" },
  { value: "FACTURE", label: "Facture" },
  { value: "PRET",    label: "Prêt" },
  { value: "EQUITY",  label: "Equity" },
];

// Clés alignées avec PUBLISHED_SORT_ORDER côté backend (funding.repository.ts).
const SORT_OPTIONS = [
  { value: "recent",       label: "Plus récentes" },
  { value: "closing_soon", label: "Date limite proche" },
  { value: "return_desc",  label: "Rendement le plus élevé" },
  { value: "amount_desc",  label: "Montant décroissant" },
  { value: "amount_asc",   label: "Montant croissant" },
];

// Clés alignées avec gradeToRiskBucket côté backend (funding.repository.ts).
const RISK_OPTIONS = [
  { value: "",          label: "Tous les risques" },
  { value: "FAIBLE",    label: "Risque faible" },
  { value: "MODERE",    label: "Risque modéré" },
  { value: "ELEVE",     label: "Risque élevé" },
  { value: "NON_NOTE",  label: "Non évalué" },
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

function SortIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

// ── filter dropdown ──────────────────────────────────────────────────────────
// <select> natif custom : le picker natif de Chrome ne s'ouvre pas quand le
// zoom de la page n'est pas à 100% (bug Chromium connu), ce qui le fait
// paraître "mort" au clic. Un menu maison, insensible au zoom, évite ça et
// permet en plus de le styliser comme le reste de l'app.
function FilterDropdown({
  icon, value, options, onChange,
}: {
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none hover:bg-slate-50"
      >
        {icon}
        <span className="whitespace-nowrap">{current.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center whitespace-nowrap rounded-[8px] px-3 py-2 text-left text-[13px] font-medium transition ${
                  o.value === value ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── opportunity card ──────────────────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: import("@/lib/use-opportunities").Opportunity }) {
  const badge   = CATEGORY_BADGE[opp.category]  ?? "bg-slate-100 text-slate-600";
  const label   = CATEGORY_LABELS[opp.category] ?? opp.category;
  const closeDate = fmtDate(opp.closesAt);
  const report = opp.scoringReports?.[0] ?? null;
  const score = report ? Math.round(Number(report.autoScore)) : null;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)]">

      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold text-slate-900">{opp.organization.legalName}</p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge}`}>
            {label}
          </span>
          {opp.investorMode === "SINGLE_INVESTOR" && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${opp.hasActiveInvestor ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>
              {opp.hasActiveInvestor ? "Investisseur unique · déjà pris" : "Investisseur unique · 100%"}
            </span>
          )}
        </div>
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
          {report && score !== null ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-slate-900">{score}/100</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${GRADE_CLASSNAMES[report.grade ?? ""] ?? "bg-slate-100 text-slate-500"}`}>
                {report.grade}
              </span>
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-slate-400">Non évalué</span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${score !== null && score >= 70 ? "bg-green-500" : score !== null && score >= 55 ? "bg-yellow-400" : score !== null && score >= 40 ? "bg-orange-400" : score !== null ? "bg-red-400" : "bg-slate-300"}`}
            style={{ width: `${score ?? 0}%` }}
          />
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

const PAGE_SIZE = 12;

export default function ExplorerPage() {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [sort,     setSort]     = useState("recent");
  const [risk,     setRisk]     = useState("");
  const [page,     setPage]     = useState(1);
  const { opportunities, total, isLoading } = useOpportunities({ category, search, sort, risk, page, limit: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSort(value);
    setPage(1);
  }

  function handleRiskChange(value: string) {
    setRisk(value);
    setPage(1);
  }

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Explorer les opportunités</p>
          <p className="text-xs text-slate-500">
            {isLoading
              ? "Recherche..."
              : `${total} opportunité${total !== 1 ? "s" : ""} disponible${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <NotifBell href="/investor/notifications" />
      </header>

      <div className="p-8 pb-16">

        {/* Barre de filtres — z-20 : reste cliquable au-dessus du header sticky (z-10) juste au-dessus */}
        <div className="relative z-20 mb-6 flex items-center gap-3">
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white pl-10 pr-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            />
          </div>

          {/* Filtre type */}
          <FilterDropdown icon={<FilterIcon />} value={category} options={CATEGORIES} onChange={handleCategoryChange} />

          {/* Tri */}
          <FilterDropdown icon={<SortIcon />} value={sort} options={SORT_OPTIONS} onChange={handleSortChange} />

          {/* Filtre risque */}
          <FilterDropdown icon={<FilterIcon />} value={risk} options={RISK_OPTIONS} onChange={handleRiskChange} />
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

        {!isLoading && total > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-9 items-center gap-1 rounded-[9px] border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Précédent
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-9 w-9 items-center justify-center rounded-[9px] text-[13px] font-medium transition ${
                  p === page
                    ? "bg-blue-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-9 items-center gap-1 rounded-[9px] border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </>
  );
}
