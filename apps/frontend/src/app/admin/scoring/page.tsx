"use client";

import { useEffect, useState } from "react";
import { useScoringAdmin, ScoringWeightCriterion } from "@/lib/use-scoring-admin";
import { ScoringSnapshotModal } from "@/components/scoring-snapshot-modal";

type Tab = "automatise" | "configuration" | "historique";

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

export default function AdminScoringPage() {
  const {
    dossiers, history, isLoading, actionLoading, launchScoring, validateReport,
    weights, weightsLoading, weightsSaving, weightsError, saveWeights,
  } = useScoringAdmin();
  const [tab, setTab] = useState<Tab>("automatise");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("Tous");
  const [draftWeights, setDraftWeights] = useState<Record<string, ScoringWeightCriterion[]>>({});
  const [snapshotReportId, setSnapshotReportId] = useState<string | null>(null);

  useEffect(() => {
    if (weights) setDraftWeights(weights);
  }, [weights]);

  const aScorer    = dossiers.filter((d) => d.scoringStatus === "A_SCORER").length;
  const enAnalyse  = dossiers.filter((d) => d.scoringStatus === "EXTRACTION").length;
  const scored     = dossiers.filter((d) =>
    ["CALCULATED", "PENDING_VALIDATION", "VALIDATED"].includes(d.scoringStatus),
  ).length;
  const aCompleter = dossiers.filter((d) => d.scoringStatus === "A_COMPLETER").length;

  const filteredDossiers = dossiers.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch  = d.pme.toLowerCase().includes(q) || d.id.toLowerCase().includes(q);
    const matchProduct = productFilter === "Tous" || d.product === productFilter;
    return matchSearch && matchProduct;
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
              { icon: "⚡", value: aScorer,    label: "À scorer",    color: "text-blue-600" },
              { icon: "⏱", value: enAnalyse,  label: "En analyse",  color: "text-yellow-600" },
              { icon: "✓", value: scored,      label: "Scoré",       color: "text-green-600" },
              { icon: "⚠", value: aCompleter, label: "À compléter", color: "text-orange-600" },
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
              placeholder="Rechercher une PME, un identifiant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
            />
            <div className="flex gap-2">
              {["Tous", "FACTURE", "PRET", "EQUITY"].map((p) => (
                <button
                  key={p}
                  onClick={() => setProductFilter(p)}
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
            {!isLoading && filteredDossiers.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Aucun dossier trouvé.</p>
            )}
            {filteredDossiers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                      <th className="px-5 py-3 text-left font-medium">DOSSIER / PME</th>
                      <th className="px-5 py-3 text-left font-medium">PRODUIT</th>
                      <th className="px-5 py-3 text-right font-medium">MONTANT</th>
                      <th className="px-5 py-3 text-left font-medium">SOUMISSION</th>
                      <th className="px-5 py-3 text-left font-medium">COMPLÉTUDE</th>
                      <th className="px-5 py-3 text-left font-medium">STATUT</th>
                      <th className="px-5 py-3 text-left font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDossiers.map((d) => {
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
                <p className="border-t border-gray-100 p-3 text-center text-xs text-gray-400">
                  {filteredDossiers.length} dossier{filteredDossiers.length !== 1 ? "s" : ""} affiché{filteredDossiers.length !== 1 ? "s" : ""}
                </p>
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
              Pour l'Equity, les actions sont réinterprétées en termes d'attractivité et aucune quotité d'avance n'est affichée.
            </p>
          </div>
        </div>
      )}

      {/* ═══ ONGLET 3 — HISTORIQUE ═══ */}
      {tab === "historique" && (
        <div>
          {history && (
            <div className="mb-6 grid grid-cols-4 gap-4">
              {[
                { label: "Scorings totaux",    value: history.stats.total,     hint: "Toutes périodes" },
                {
                  label: "Publiés",
                  value: history.stats.published,
                  hint: `${history.stats.total > 0
                    ? Math.round((history.stats.published / history.stats.total) * 100)
                    : 0}% du total`,
                },
                { label: "Score moyen",        value: history.stats.avgScore,              hint: "/100" },
                {
                  label: "Versions de barème",
                  value: history.stats.baremeVersions.length,
                  hint: history.stats.baremeVersions.join(" · ") || "—",
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

          <div className="rounded-xl border border-gray-200 bg-white">
            {isLoading && <p className="p-5 text-sm text-gray-400">Chargement…</p>}
            {!isLoading && (!history || history.reports.length === 0) && (
              <div className="p-10 text-center">
                <p className="text-sm text-gray-400">Aucun scoring calculé pour le moment.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Lancez un scoring depuis l'onglet "Scoring automatisé".
                </p>
              </div>
            )}
            {history && history.reports.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                      <th className="px-5 py-3 text-left font-medium">DATE & HEURE</th>
                      <th className="px-5 py-3 text-left font-medium">PME</th>
                      <th className="px-5 py-3 text-left font-medium">PRODUIT</th>
                      <th className="px-5 py-3 text-center font-medium">SCORE</th>
                      <th className="px-5 py-3 text-center font-medium">GRADE</th>
                      <th className="px-5 py-3 text-left font-medium">BARÈME</th>
                      <th className="px-5 py-3 text-left font-medium">ANALYSTE</th>
                      <th className="px-5 py-3 text-left font-medium">DÉCISION</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.reports.map((report) => {
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
                <p className="border-t border-gray-100 p-3 text-center text-xs text-gray-400">
                  {history.reports.length} scoring{history.reports.length !== 1 ? "s" : ""} · Chaque enregistrement est immuable
                </p>
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
