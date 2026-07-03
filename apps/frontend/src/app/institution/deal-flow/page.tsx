"use client";

import { useState } from "react";
import { useInstitutionData, gradeToRisk, isRecentlyCreated, GRADE_CLASSNAMES, RISK_CLASSNAMES } from "@/lib/use-institution-data";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

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

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  return `${(v / 1_000).toFixed(0)}K`;
}

export default function DealFlowPage() {
  const { opportunities, investments, isLoading, refresh } = useInstitutionData();
  const { token } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tous");
  const [riskFilter, setRiskFilter] = useState("Tous");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const engagedFundingRequestIds = new Set(investments.map((inv) => inv.fundingRequest.id));

  const filtered = opportunities.filter((opp) => {
    const matchSearch =
      opp.organization.legalName.toLowerCase().includes(search.toLowerCase()) ||
      opp.organization.sector.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "Tous" || opp.category === categoryFilter;
    const risk = gradeToRisk(opp.scoringReports[0]?.grade ?? null);
    const matchRisk = riskFilter === "Tous" || risk === riskFilter;
    return matchSearch && matchCategory && matchRisk;
  });

  async function handleEngage(opportunityId: string, amount: number, proposedReturn: number) {
    if (!token) return;
    setActionLoading(opportunityId);
    try {
      await api.post("/investments", {
        fundingRequestId: opportunityId,
        amountCommitted: amount,
        proposedReturn,
      }, token);
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Deal Flow</h1>
        <p className="text-sm text-gray-500">
          {filtered.length} opportunités disponibles · Accès institutionnel
        </p>
      </div>

      {/* Bannière Premium */}
      <div className="mb-6 flex items-center justify-between rounded-xl bg-brand-700 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-yellow-400">⭐</span>
          <div>
            <p className="text-sm font-semibold text-white">Accès Institutionnel Premium</p>
            <p className="text-xs text-brand-100">
              Vous avez accès en avant-première aux opportunités supérieures à 100M FCFA et aux dossiers marqués Premium.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
          PREMIUM
        </span>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher une PME, un secteur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
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
        <div className="flex gap-1">
          {["Tous", "Faible", "Modéré", "Élevé"].map((r) => (
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

          const isEngaged = engagedFundingRequestIds.has(opp.id);
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
                  <p className="text-sm font-bold text-gray-900">{formatAmount(requested)}M</p>
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

              <div className="flex gap-2">
                <button
                  onClick={() => handleEngage(opp.id, requested * 0.3, Number(opp.expectedReturn ?? 8))}
                  disabled={actionLoading === opp.id}
                  className="flex-1 rounded-md bg-brand-700 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  {actionLoading === opp.id ? "Envoi..." : "Soumettre au comité"}
                </button>
                <button
                  onClick={() => router.push(`/investor/opportunites/${opp.id}`)}
                  className="rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Analyser
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
