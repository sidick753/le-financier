"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { useScoringWeights, ScoringWeightCriterion } from "@/lib/use-scoring-weights";
import { useSortableRows } from "@/lib/use-sortable-rows";
import { SortableTh } from "@/components/ui/sortable-th";
import { ScoringSnapshotModal } from "@/components/scoring-snapshot-modal";

type Tab = "automatise" | "configuration" | "historique";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const PRODUCT_LABELS: Record<string, { label: string; className: string }> = {
  FACTURE: { label: "Affacturage",  className: "bg-blue-50 text-blue-700" },
  PRET:    { label: "Prêt MLT",    className: "bg-purple-50 text-purple-700" },
  EQUITY:  { label: "Equity",      className: "bg-orange-50 text-orange-700" },
};

const GRADE_STYLES: Record<string, string> = {
  "A+":  "bg-green-100 text-green-700 border-green-200",
  "A":   "bg-green-50 text-green-600 border-green-100",
  "BBB": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "BB":  "bg-orange-50 text-orange-700 border-orange-200",
  "B":   "bg-red-50 text-red-700 border-red-200",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  A_SCORER:           { label: "À scorer",    className: "bg-blue-100 text-blue-700" },
  EXTRACTION:         { label: "En analyse",  className: "bg-yellow-100 text-yellow-700" },
  CALCULATED:         { label: "Scoré",       className: "bg-green-100 text-green-700" },
  PENDING_VALIDATION: { label: "Scoré",       className: "bg-green-100 text-green-700" },
  A_COMPLETER:        { label: "À compléter", className: "bg-orange-100 text-orange-700" },
  VALIDATED:          { label: "Publié",      className: "bg-brand-100 text-brand-700" },
  REFUSED:            { label: "Refusé",      className: "bg-red-100 text-red-700" },
  ERREUR_CALCUL:      { label: "Erreur de calcul", className: "bg-red-100 text-red-700" },
};

const DECISION_CONFIG: Record<string, { label: string; className: string }> = {
  VALIDATED:            { label: "Publié",      className: "text-green-600" },
  REFUSED:              { label: "Refusé",      className: "text-red-600" },
  CALCULATED:           { label: "Brouillon",   className: "text-gray-400" },
  PENDING_VALIDATION:   { label: "Brouillon",   className: "text-gray-400" },
  COMPLEMENTS_DEMANDES: { label: "Compléments", className: "text-orange-600" },
};

const BAREME = [
  { grade: "A+",  min: 85, max: 100, action: "Publier immédiatement",              color: "bg-green-500" },
  { grade: "A",   min: 70, max:  84, action: "Publier après validation",            color: "bg-green-400" },
  { grade: "BBB", min: 55, max:  69, action: "Soumettre au comité crédit",          color: "bg-yellow-400" },
  { grade: "BB",  min: 40, max:  54, action: "Demander garanties supplémentaires",  color: "bg-orange-400" },
  { grade: "B",   min:  0, max:  39, action: "Refuser",                            color: "bg-red-500" },
];

interface ScoringDossier {
  id: string;
  pme: string;
  product: string;
  amount: string;
  submittedAt: string;
  completude: number;
  scoringStatus: string;
  grade: string | null;
  score: number | null;
  reportId: string | null;
  scoringError: string | null;
}

interface DashboardStats {
  aScorer: number;
  enAnalyse: number;
  scored: number;
  aCompleter: number;
}

interface ScoringHistoryReport {
  id: string;
  // Décimal Prisma sérialisé en string sur le fil JSON.
  autoScore: string;
  grade: string | null;
  bareme_version: string;
  status: string;
  createdAt: string;
  organization: { legalName: string };
  fundingRequest: { title: string; category: string } | null;
  validatedBy: { firstName: string; lastName: string } | null;
}

interface HistoryStats {
  total: number;
  published: number;
  avgScore: number;
  baremeVersions: string[];
}

export default function AdminScoringPage() {
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();
  const {
    weights, weightsLoading, weightsSaving, weightsError, saveWeights,
  } = useScoringWeights();

  const [tab, setTab] = useState<Tab>("automatise");
  const [draftWeights, setDraftWeights] = useState<Record<string, ScoringWeightCriterion[]>>({});
  const [snapshotReportId, setSnapshotReportId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (weights) setDraftWeights(weights);
  }, [weights]);

  // ── Tab 1 : dossiers (scoring automatisé) ──────────────────────────────────
  const [dossierSearchInput, setDossierSearchInput] = useState("");
  const [dossierSearch, setDossierSearch] = useState("");
  const [productFilter, setProductFilter] = useState("Tous");
  const [dossierPage, setDossierPage] = useState(1);
  const [dossiers, setDossiers] = useState<ScoringDossier[]>([]);
  const [dossierTotal, setDossierTotal] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const latestDossierRequestId = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDossierSearch(dossierSearchInput);
      setDossierPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [dossierSearchInput]);

  const fetchDossiers = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    const requestId = ++latestDossierRequestId.current;
    const params = new URLSearchParams();
    if (dossierSearch) params.set("search", dossierSearch);
    if (productFilter !== "Tous") params.set("product", productFilter);
    params.set("page", String(dossierPage));
    params.set("limit", String(PAGE_SIZE));

    api
      .get<{ data: ScoringDossier[]; total: number }>(`/scoring/dashboard?${params.toString()}`, token)
      .then((res) => {
        if (requestId !== latestDossierRequestId.current) return;
        setDossiers(res.data);
        setDossierTotal(res.total);
        setIsLoading(false);
        const lastPage = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
        if (res.data.length === 0 && dossierPage > lastPage) {
          setDossierPage(lastPage);
        }
      })
      .catch(() => {
        if (requestId === latestDossierRequestId.current) setIsLoading(false);
      });
  }, [token, dossierSearch, productFilter, dossierPage]);

  const fetchDashboardStats = useCallback(() => {
    if (!token) return;
    api.get<DashboardStats>("/scoring/dashboard/stats", token).then(setDashboardStats);
  }, [token]);

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // ── Tab 3 : historique ──────────────────────────────────────────────────────
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyReports, setHistoryReports] = useState<ScoringHistoryReport[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const latestHistoryRequestId = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHistorySearch(historySearchInput);
      setHistoryPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [historySearchInput]);

  const fetchHistory = useCallback(() => {
    if (!token) return;
    setIsHistoryLoading(true);
    const requestId = ++latestHistoryRequestId.current;
    const params = new URLSearchParams();
    if (historySearch) params.set("search", historySearch);
    params.set("page", String(historyPage));
    params.set("limit", String(PAGE_SIZE));

    api
      .get<{ data: ScoringHistoryReport[]; total: number }>(`/scoring/history?${params.toString()}`, token)
      .then((res) => {
        if (requestId !== latestHistoryRequestId.current) return;
        setHistoryReports(res.data);
        setHistoryTotal(res.total);
        setIsHistoryLoading(false);
        const lastPage = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
        if (res.data.length === 0 && historyPage > lastPage) {
          setHistoryPage(lastPage);
        }
      })
      .catch(() => {
        if (requestId === latestHistoryRequestId.current) setIsHistoryLoading(false);
      });
  }, [token, historySearch, historyPage]);

  const fetchHistoryStats = useCallback(() => {
    if (!token) return;
    api.get<HistoryStats>("/scoring/history/stats", token).then(setHistoryStats);
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistoryStats();
  }, [fetchHistoryStats]);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function launchScoring(fundingRequestId: string) {
    if (!token) return;
    setActionLoading(fundingRequestId);
    try {
      await api.post(`/scoring/compute/${fundingRequestId}`, {}, token);
    } finally {
      fetchDossiers();
      fetchDashboardStats();
      refreshBadges();
      setActionLoading(null);
    }
  }

  async function validateReport(reportId: string, score?: number, notes?: string) {
    if (!token) return;
    setActionLoading(reportId);
    try {
      await api.patch(`/scoring/report/${reportId}/validate`, { validatedScore: score, notes }, token);
      fetchDossiers();
      fetchDashboardStats();
      fetchHistory();
      fetchHistoryStats();
      refreshBadges();
    } finally {
      setActionLoading(null);
    }
  }

  const dossierTotalPages = Math.max(1, Math.ceil(dossierTotal / PAGE_SIZE));
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / PAGE_SIZE));

  const {
    sortedRows: sortedDossiers,
    sortKey: dossierSortKey,
    direction: dossierDirection,
    toggleSort: toggleDossierSort,
  } = useSortableRows(dossiers, {
    pme: (d) => d.pme,
    product: (d) => d.product,
    amount: (d) => Number(d.amount),
    submittedAt: (d) => d.submittedAt,
    completude: (d) => d.completude,
    status: (d) => d.scoringStatus,
  });

  const {
    sortedRows: sortedHistoryReports,
    sortKey: historySortKey,
    direction: historyDirection,
    toggleSort: toggleHistorySort,
  } = useSortableRows(historyReports, {
    createdAt: (r) => r.createdAt,
    pme: (r) => r.organization.legalName,
    product: (r) => r.fundingRequest?.category ?? "",
    score: (r) => Number(r.autoScore),
    grade: (r) => r.grade ?? "",
    bareme: (r) => r.bareme_version,
    analyste: (r) => (r.validatedBy ? `${r.validatedBy.firstName} ${r.validatedBy.lastName}` : ""),
    decision: (r) => r.status,
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Moteur de scoring LeFinancier™</h1>
          <p className="text-sm text-gray-500">3 moteurs distincts · Affacturage · Prêt MLT · Equity</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700">
          ✓ Moteur actif
        </span>
      </div>

      {/* Onglets */}
      <div className="mb-6 flex border-b border-gray-200">
        {[
          { id: "automatise",    label: "⚡ Scoring automatisé" },
          { id: "configuration", label: "⚙️ Configuration" },
          { id: "historique",    label: "🕐 Historique" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`mr-6 pb-3 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-brand-700 text-brand-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ ONGLET 1 — SCORING AUTOMATISÉ ═══ */}
      {tab === "automatise" && (
        <div>
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs text-blue-800">
              ℹ️ <strong>Auditabilité complète.</strong> Chaque score est horodaté à la seconde et lié à la version du barème en vigueur au moment du calcul.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-4 gap-4">
            {[
              { icon: "⚡", value: dashboardStats ? dashboardStats.aScorer : "…",    label: "À scorer",    color: "text-blue-600" },
              { icon: "⏱", value: dashboardStats ? dashboardStats.enAnalyse : "…",  label: "En analyse",  color: "text-yellow-600" },
              { icon: "✓", value: dashboardStats ? dashboardStats.scored : "…",      label: "Scoré",       color: "text-green-600" },
              { icon: "⚠", value: dashboardStats ? dashboardStats.aCompleter : "…", label: "À compléter", color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
                <p className={`text-2xl font-bold ${s.color}`}>{s.icon} {s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Rechercher une PME…"
              value={dossierSearchInput}
              onChange={(e) => setDossierSearchInput(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            />
            <div className="flex gap-2">
              {["Tous", "FACTURE", "PRET", "EQUITY"].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setProductFilter(p);
                    setDossierPage(1);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    productFilter === p
                      ? "bg-brand-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p === "Tous" ? "Tous" : PRODUCT_LABELS[p]?.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            {isLoading && <p className="p-5 text-sm text-gray-400">Chargement…</p>}
            {!isLoading && dossiers.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Aucun dossier trouvé.</p>
            )}
            {dossiers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                      <SortableTh label="DOSSIER / PME" sortKey="pme" currentKey={dossierSortKey} direction={dossierDirection} onSort={toggleDossierSort} />
                      <SortableTh label="PRODUIT" sortKey="product" currentKey={dossierSortKey} direction={dossierDirection} onSort={toggleDossierSort} />
                      <SortableTh label="MONTANT" sortKey="amount" currentKey={dossierSortKey} direction={dossierDirection} onSort={toggleDossierSort} align="right" />
                      <SortableTh label="SOUMISSION" sortKey="submittedAt" currentKey={dossierSortKey} direction={dossierDirection} onSort={toggleDossierSort} />
                      <SortableTh label="COMPLÉTUDE" sortKey="completude" currentKey={dossierSortKey} direction={dossierDirection} onSort={toggleDossierSort} />
                      <SortableTh label="STATUT" sortKey="status" currentKey={dossierSortKey} direction={dossierDirection} onSort={toggleDossierSort} />
                      <th className="px-5 py-3 text-left font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedDossiers.map((d) => {
                      const productCfg = PRODUCT_LABELS[d.product];
                      const statusCfg  = STATUS_CONFIG[d.scoringStatus] ?? STATUS_CONFIG.A_SCORER;
                      const canScore   = d.scoringStatus === "A_SCORER" || d.scoringStatus === "ERREUR_CALCUL";
                      const hasScore   = d.score !== null && d.grade !== null;

                      return (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-5 py-4">
                            <p className="font-medium text-gray-900">{d.pme}</p>
                            <p className="text-xs text-gray-400">{d.id.slice(0, 8).toUpperCase()}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${productCfg?.className}`}>
                              {productCfg?.label ?? d.product}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right text-xs font-medium text-gray-900">
                            {Number(d.amount).toLocaleString("fr-FR")} F CFA
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-500">
                            {new Date(d.submittedAt).toLocaleDateString("fr-FR", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 rounded-full bg-gray-100">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    d.completude >= 80
                                      ? "bg-green-500"
                                      : d.completude >= 50
                                      ? "bg-yellow-400"
                                      : "bg-red-400"
                                  }`}
                                  style={{ width: `${d.completude}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{d.completude}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                                {statusCfg.label}
                              </span>
                              {hasScore && (
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${GRADE_STYLES[d.grade!] ?? ""}`}>
                                  {d.grade}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {canScore && (
                              <button
                                onClick={() => launchScoring(d.id)}
                                disabled={actionLoading === d.id}
                                className="flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                              >
                                {actionLoading === d.id ? "⏳" : "⚡"} {d.scoringStatus === "ERREUR_CALCUL" ? "Relancer le scoring" : "Lancer le scoring"}
                              </button>
                            )}
                            {hasScore && d.reportId && (
                              <button
                                onClick={() => validateReport(d.reportId!, d.score ?? undefined)}
                                disabled={actionLoading === d.reportId}
                                className="text-xs text-green-600 hover:underline disabled:opacity-50"
                              >
                                ✓ Valider
                              </button>
                            )}
                            {d.scoringStatus === "A_COMPLETER" && (
                              <span className="text-xs text-orange-600">⚠ Dossier incomplet</span>
                            )}
                            {d.scoringStatus === "ERREUR_CALCUL" && d.scoringError && (
                              <p className="mt-1 max-w-xs truncate text-xs text-red-500" title={d.scoringError}>
                                {d.scoringError}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {dossierTotal > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
                <p>
                  {dossierTotal} dossier{dossierTotal !== 1 ? "s" : ""} au total
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDossierPage((p) => Math.max(1, p - 1))}
                    disabled={dossierPage <= 1}
                    className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <span>
                    Page {dossierPage} / {dossierTotalPages}
                  </span>
                  <button
                    onClick={() => setDossierPage((p) => Math.min(dossierTotalPages, p + 1))}
                    disabled={dossierPage >= dossierTotalPages}
                    className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ ONGLET 2 — CONFIGURATION ═══ */}
      {tab === "configuration" && (
        <div className="space-y-6">
          {weightsLoading && !weights && (
            <p className="p-5 text-sm text-gray-400">Chargement des pondérations…</p>
          )}

          {weightsError && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {weightsError}
            </div>
          )}

          {(["FACTURE", "PRET", "EQUITY"] as const).map((product) => {
            const productCfg = PRODUCT_LABELS[product];
            const criteria   = draftWeights[product];
            if (!criteria) return null;

            const savedCriteria = weights?.[product] ?? [];
            const total   = criteria.reduce((s, c) => s + c.weight, 0);
            const isDirty = JSON.stringify(criteria) !== JSON.stringify(savedCriteria);
            const isSaving = weightsSaving === product;

            return (
              <div key={product} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${productCfg.className}`}>
                      {productCfg.label}
                    </span>
                    <p className="text-sm font-semibold text-gray-900">Moteur {productCfg.label}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    total === 100 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {total === 100 ? "✓ Validé" : `⚠ Total = ${total}%`}
                  </span>
                </div>

                <div className="space-y-4">
                  {criteria.map((criterion, index) => (
                    <div key={criterion.key}>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs text-gray-700">{criterion.label}</p>
                        <span className="text-xs font-bold text-gray-900">{criterion.weight} %</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={60}
                        value={criterion.weight}
                        onChange={(e) => {
                          setDraftWeights({
                            ...draftWeights,
                            [product]: criteria.map((c, i) =>
                              i === index ? { ...c, weight: Number(e.target.value) } : c,
                            ),
                          });
                        }}
                        className="w-full accent-brand-700"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">
                    Total :{" "}
                    <strong className={total === 100 ? "text-green-600" : "text-red-600"}>
                      {total}%
                    </strong>
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      disabled={!isDirty || isSaving}
                      onClick={() => setDraftWeights({ ...draftWeights, [product]: savedCriteria })}
                      className="text-xs text-gray-500 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Annuler
                    </button>
                    <button
                      disabled={!isDirty || total !== 100 || isSaving}
                      onClick={() => saveWeights(product, criteria).catch(() => {})}
                      className="text-xs font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSaving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="mb-4 text-sm font-semibold text-gray-900">
              Barème des grades (commun aux 3 moteurs)
            </p>
            <div className="space-y-2">
              {BAREME.map((b) => (
                <div key={b.grade} className="flex items-center gap-3">
                  <span className={`flex h-7 w-10 items-center justify-center rounded-md text-xs font-bold text-white ${b.color}`}>
                    {b.grade}
                  </span>
                  <span className="w-28 text-xs text-gray-500">Score {b.min} – {b.max}</span>
                  <span className="text-xs text-gray-600">{b.action}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs italic text-gray-400">
              Pour l&apos;Equity, les actions sont réinterprétées en termes d&apos;attractivité et aucune quotité d&apos;avance n&apos;est affichée.
            </p>
          </div>
        </div>
      )}

      {/* ═══ ONGLET 3 — HISTORIQUE ═══ */}
      {tab === "historique" && (
        <div>
          {historyStats && (
            <div className="mb-6 grid grid-cols-4 gap-4">
              {[
                { label: "Scorings totaux",    value: historyStats.total,     hint: "Toutes périodes" },
                {
                  label: "Publiés",
                  value: historyStats.published,
                  hint: `${historyStats.total > 0
                    ? Math.round((historyStats.published / historyStats.total) * 100)
                    : 0}% du total`,
                },
                { label: "Score moyen",        value: historyStats.avgScore,              hint: "/100" },
                {
                  label: "Versions de barème",
                  value: historyStats.baremeVersions.length,
                  hint: historyStats.baremeVersions.join(" · ") || "—",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.hint}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher une PME…"
              value={historySearchInput}
              onChange={(e) => setHistorySearchInput(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            {isHistoryLoading && <p className="p-5 text-sm text-gray-400">Chargement…</p>}
            {!isHistoryLoading && historyReports.length === 0 && (
              <div className="p-10 text-center">
                <p className="text-sm text-gray-400">Aucun scoring calculé pour le moment.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Lancez un scoring depuis l&apos;onglet &quot;Scoring automatisé&quot;.
                </p>
              </div>
            )}
            {historyReports.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                      <SortableTh label="DATE & HEURE" sortKey="createdAt" currentKey={historySortKey} direction={historyDirection} onSort={toggleHistorySort} />
                      <SortableTh label="PME" sortKey="pme" currentKey={historySortKey} direction={historyDirection} onSort={toggleHistorySort} />
                      <SortableTh label="PRODUIT" sortKey="product" currentKey={historySortKey} direction={historyDirection} onSort={toggleHistorySort} />
                      <SortableTh label="SCORE" sortKey="score" currentKey={historySortKey} direction={historyDirection} onSort={toggleHistorySort} align="center" />
                      <SortableTh label="GRADE" sortKey="grade" currentKey={historySortKey} direction={historyDirection} onSort={toggleHistorySort} align="center" />
                      <SortableTh label="BARÈME" sortKey="bareme" currentKey={historySortKey} direction={historyDirection} onSort={toggleHistorySort} />
                      <SortableTh label="ANALYSTE" sortKey="analyste" currentKey={historySortKey} direction={historyDirection} onSort={toggleHistorySort} />
                      <SortableTh label="DÉCISION" sortKey="decision" currentKey={historySortKey} direction={historyDirection} onSort={toggleHistorySort} />
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedHistoryReports.map((report) => {
                      const cat        = report.fundingRequest?.category ?? "";
                      const productCfg = PRODUCT_LABELS[cat] ?? { label: "—", className: "bg-gray-100 text-gray-500" };
                      const decisionCfg = DECISION_CONFIG[report.status] ?? { label: report.status, className: "text-gray-400" };

                      return (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <p className="text-xs font-medium text-gray-900">
                              {new Date(report.createdAt).toLocaleDateString("fr-FR", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(report.createdAt).toLocaleTimeString("fr-FR", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-xs font-medium text-gray-900">
                            {report.organization.legalName}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${productCfg.className}`}>
                              {productCfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center text-xs font-bold text-gray-900">
                            {Number(report.autoScore).toFixed(1)}/100
                          </td>
                          <td className="px-5 py-3 text-center">
                            {report.grade && (
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${GRADE_STYLES[report.grade] ?? ""}`}>
                                {report.grade}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">v{report.bareme_version}</td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {report.validatedBy
                              ? `${report.validatedBy.firstName[0]}. ${report.validatedBy.lastName}`
                              : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-medium ${decisionCfg.className}`}>
                              {decisionCfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => setSnapshotReportId(report.id)}
                              className="text-xs text-brand-700 hover:underline"
                            >
                              📋 Snapshot
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {historyTotal > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
                <p>
                  {historyTotal} scoring{historyTotal !== 1 ? "s" : ""} au total · Chaque enregistrement est immuable
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage <= 1}
                    className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <span>
                    Page {historyPage} / {historyTotalPages}
                  </span>
                  <button
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage >= historyTotalPages}
                    className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {snapshotReportId && (
        <ScoringSnapshotModal
          reportId={snapshotReportId}
          onClose={() => setSnapshotReportId(null)}
        />
      )}
    </div>
  );
}
