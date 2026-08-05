"use client";

import { useState } from "react";
import { useInstitutionData, gradeToRisk, isRecentlyCreated, GRADE_CLASSNAMES, RISK_CLASSNAMES, InstitutionOpportunity } from "@/lib/use-institution-data";
import { useRouter } from "next/navigation";
import { NotifBell } from "@/components/ui/notif-bell";
import { formatCompactAmount } from "@/lib/admin-ui";

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt MLT",
  EQUITY: "Equity",
};

const STATUS_DEAL_FLOW: Record<string, { label: string; className: string }> = {
  engaged: { label: "En cours", className: "bg-purple-100 text-purple-700" },
  new: { label: "Nouveau", className: "bg-green-100 text-green-700" },
  available: { label: "Disponible", className: "bg-blue-100 text-blue-700" },
};

// Mêmes clés que SORT_OPTIONS côté investor/explorer (et PUBLISHED_SORT_ORDER
// côté backend) — appliqué ici côté client puisque le deal flow institution
// charge déjà tout `opportunities` sans pagination.
const SORT_OPTIONS = [
  { value: "recent",       label: "Plus récentes" },
  { value: "closing_soon", label: "Date limite proche" },
  { value: "return_desc",  label: "Rendement le plus élevé" },
  { value: "amount_desc",  label: "Montant décroissant" },
  { value: "amount_asc",   label: "Montant croissant" },
];

function SortDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        <span className="whitespace-nowrap">{current.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                  o.value === value ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50"
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

function compareOpportunities(a: InstitutionOpportunity, b: InstitutionOpportunity, sort: string) {
  switch (sort) {
    case "return_desc": {
      const ra = a.expectedReturn != null ? Number(a.expectedReturn) : -Infinity;
      const rb = b.expectedReturn != null ? Number(b.expectedReturn) : -Infinity;
      return rb - ra;
    }
    case "amount_desc":
      return Number(b.amountRequested) - Number(a.amountRequested);
    case "amount_asc":
      return Number(a.amountRequested) - Number(b.amountRequested);
    case "closing_soon": {
      const ca = a.closesAt ? new Date(a.closesAt).getTime() : Infinity;
      const cb = b.closesAt ? new Date(b.closesAt).getTime() : Infinity;
      return ca - cb;
    }
    case "recent":
    default:
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
}

export default function DealFlowPage() {
  const { opportunities, investments, isLoading } = useInstitutionData();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tous");
  const [riskFilter, setRiskFilter] = useState("Tous");
  const [sort, setSort] = useState("recent");

  const engagedFundingRequestIds = new Set(investments.map((inv) => inv.fundingRequest.id));

  const filtered = opportunities
    .filter((opp) => {
      const matchSearch =
        opp.organization.legalName.toLowerCase().includes(search.toLowerCase()) ||
        opp.organization.sector.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === "Tous" || opp.category === categoryFilter;
      const risk = gradeToRisk(opp.scoringReports[0]?.grade ?? null);
      const matchRisk =
        riskFilter === "Tous" ||
        (riskFilter === "Non noté" ? risk === null : risk === riskFilter);
      return matchSearch && matchCategory && matchRisk;
    })
    .sort((a, b) => compareOpportunities(a, b, sort));

  return (
    <>
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Deal Flow</p>
          <p className="text-xs text-slate-500">
            {filtered.length} opportunités disponibles · Accès institutionnel
          </p>
        </div>
        <NotifBell href="/institution/notifications" />
      </header>

      <div className="p-8 pb-16">
        {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher une PME, un secteur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-50 flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-brand-700">Catégorie :</span>
          <div className="flex gap-1">
            {["Tous", "FACTURE", "PRET", "EQUITY"].map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  categoryFilter === c ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {c === "Tous" ? "Tous" : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-800">Risque :</span>
          <div className="flex gap-1">
            {["Tous", "Faible", "Modéré", "Élevé", "Non noté"].map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  riskFilter === r ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <SortDropdown value={sort} onChange={setSort} />
      </div>

      {/* Grille 2 colonnes */}
      {isLoading && <p className="text-sm text-gray-400">Chargement...</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-gray-400">Aucune opportunité disponible.</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((opp) => {
          const requested = Number(opp.amountRequested);
          const raised = Number(opp.amountRaised);
          const progress = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;
          const isLarge = requested >= 100_000_000;
          const report = opp.scoringReports[0];
          const risk = gradeToRisk(report?.grade ?? null);
          const isSingleInvestor = opp.investorMode === "SINGLE_INVESTOR";

          const isEngaged = engagedFundingRequestIds.has(opp.id);
          // hasActiveInvestor compte aussi notre propre engagement (NEGOTIATING/COMMITTED) —
          // ne signale "déjà pris par un autre" que si ce n'est pas nous.
          const isTakenByOther = isSingleInvestor && opp.hasActiveInvestor && !isEngaged;
          const isNew = isRecentlyCreated(opp.createdAt);
          const statusConfig = isEngaged
            ? STATUS_DEAL_FLOW.engaged
            : isNew
              ? STATUS_DEAL_FLOW.new
              : STATUS_DEAL_FLOW.available;

          return (
            <div
              key={opp.id}
              className={`rounded-xl border bg-white p-5 ${isLarge ? "border-yellow-300" : "border-gray-200"}`}
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{opp.organization.legalName}</p>
                    {isLarge && <span className="text-yellow-500">⭐</span>}
                  </div>
                  <p className="text-xs text-gray-400">{opp.organization.sector}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}>
                    {statusConfig.label}
                  </span>
                  {isSingleInvestor && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isTakenByOther ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>
                      {isTakenByOther ? "Investisseur unique · déjà pris" : "Investisseur unique · 100%"}
                    </span>
                  )}
                  {report?.grade ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${GRADE_CLASSNAMES[report.grade] ?? "bg-gray-100 text-gray-600"}`}>
                      {report.grade}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400">Non noté</span>
                  )}
                </div>
              </div>

              <p className="mb-4 line-clamp-2 text-xs text-gray-600">{opp.description}</p>

              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-400">Montant</p>
                  <p className="text-sm font-bold text-gray-900">{formatCompactAmount(requested)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rendement</p>
                  <p className="text-sm font-bold text-green-600">
                    {opp.expectedReturn ? `${Number(opp.expectedReturn)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Durée</p>
                  <p className="text-sm font-bold text-gray-900">
                    {opp.durationMonths ? `${opp.durationMonths} mois` : "—"}
                  </p>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs ${risk ? RISK_CLASSNAMES[risk] : "bg-gray-100 text-gray-500"}`}>
                  {risk ?? "Non évalué"}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {CATEGORY_LABELS[opp.category]}
                </span>
                {opp.organization.sector && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {opp.organization.sector}
                  </span>
                )}
              </div>

              <div className="mb-4">
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Financé</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => router.push(`/institution/deal-flow/${opp.id}`)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Analyser
              </button>
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
}
