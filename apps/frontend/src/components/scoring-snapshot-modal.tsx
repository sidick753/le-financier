"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface CriterionResult {
  key: string;
  label: string;
  weight: number;
  rawScore: number | null;
  evaluable: boolean;
  penalized: boolean;
  reliability: number;
  detail: Record<string, number | null>;
  note: string;
}

interface SnapshotData {
  scorable?: boolean;
  score?: number | null;
  grade?: string | null;
  gradeCapped?: boolean;
  coverage?: number;
  confidence?: number;
  confidenceLabel?: string;
  advanceRate?: number | null;
  recommendation?: string | null;
  criteria?: CriterionResult[];
  missingData?: string[];
  blockingReason?: string | null;
  // Champs saisis par la PME mais qui ne pèsent pas dans le barème pondéré — contexte analyste uniquement.
  nonScoredFields?: string[];
  [key: string]: unknown;
}

interface Report {
  id: string;
  // Décimaux Prisma sérialisés en string sur le fil JSON.
  autoScore: string;
  grade: string | null;
  gradeCapped: boolean;
  coverage: string;
  confidence: string;
  bareme_version: string;
  product: string;
  status: string;
  createdAt: string;
  kpiSnapshot: SnapshotData;
  organization: { legalName: string };
  fundingRequest: { title: string; category: string } | null;
  validatedBy: { firstName: string; lastName: string } | null;
}

const DETAIL_KEY_LABELS: Record<string, string> = {
  dscr: "DSCR",
  garantieCouverture: "Couverture garantie",
  fluxMobileMoneyMensuel: "Flux Mobile Money mensuel",
  dirigeantExperienceAns: "Expérience dirigeant (ans)",
  experienceSecteurAns: "Expérience secteur (ans)",
  tcamCa3ansPct: "TCAM CA 3 ans",
  tauxImpaye12mPct: "Taux d'impayé (12 mois)",
  partPlusGrosClientPct: "Part du plus gros client",
  autonomieFinancierePct: "Autonomie financière",
  tauxEndettementPct: "Taux d'endettement",
};

// Clés dont la valeur numérique est déjà un pourcentage (0-100).
const DETAIL_PCT_KEYS = new Set([
  "tcamCa3ansPct", "tauxImpaye12mPct", "partPlusGrosClientPct",
  "autonomieFinancierePct", "tauxEndettementPct",
]);

// Ratios de couverture (ex. DSCR 1.83× = le cash-flow couvre 1.83x la dette) — un
// multiplicateur, pas un pourcentage ni un score.
const DETAIL_RATIO_KEYS = new Set(["dscr", "garantieCouverture"]);

function formatDetailValue(key: string, value: number): string {
  if (DETAIL_PCT_KEYS.has(key)) return `${value.toFixed(1)} %`;
  if (DETAIL_RATIO_KEYS.has(key)) return `${value.toFixed(2)}×`;
  return value.toFixed(1);
}

const NON_SCORED_FIELD_LABELS: Record<string, string> = {
  nbClientsActifs: "Nombre de clients actifs",
  ratioLiquidite: "Ratio de liquidité",
  dirigeantAntecedents: "Antécédents du dirigeant",
  trackRecord: "Track record",
  partMarcheRelative: "Part de marché relative",
  margeBrute: "Marge brute",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-green-700 bg-green-100",
  "A": "text-green-600 bg-green-50",
  "BBB": "text-yellow-700 bg-yellow-100",
  "BB": "text-orange-700 bg-orange-100",
  "B": "text-red-700 bg-red-100",
};

interface Props {
  reportId: string;
  onClose: () => void;
}

export function ScoringSnapshotModal({ reportId, onClose }: Props) {
  const { token } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"synthese" | "criteres" | "json">("synthese");

  useEffect(() => {
    if (!token) return;
    api
      .get<Report>(`/scoring/report/${reportId}`, token)
      .then(setReport)
      .finally(() => setIsLoading(false));
  }, [reportId, token]);

  // Ferme sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function formatDate(d: string) {
    return new Date(d).toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  }

  const snapshot = report?.kpiSnapshot;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-base font-semibold text-gray-900">
              Snapshot de scoring — {report?.organization.legalName ?? "…"}
            </p>
            <p className="text-xs text-gray-400">
              {report ? formatDate(report.createdAt) : "…"} · Version barème v{report?.bareme_version}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {report?.grade && (
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${GRADE_COLORS[report.grade] ?? ""}`}>
                {report.grade}
              </span>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-100 px-6">
          {[
            { id: "synthese", label: "Synthèse" },
            { id: "criteres", label: "Détail des critères" },
            // { id: "json", label: "JSON brut" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`mr-4 py-3 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "border-b-2 border-brand-700 text-brand-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <p className="text-center text-sm text-gray-400">Chargement du snapshot...</p>
          )}

          {/* SYNTHÈSE */}
          {!isLoading && activeTab === "synthese" && report && snapshot && (() => {
            // "Couverture" n'a pas le même sens selon le moteur : quotité d'avance pour
            // FACTURE (déjà affichée dans le bloc vert ci-dessous — on évite le doublon),
            // ratio garantie/prêt pouvant dépasser 100% pour PRET, valeur constante et
            // non significative pour EQUITY (on la masque plutôt que d'afficher un faux 100%).
            const kpis = [
              { label: "Score", value: `${Number(report.autoScore).toFixed(1)}/100`, highlight: true },
              ...(report.product === "PRET"
                ? [{ label: "Couverture garantie", value: `${Number(report.coverage).toFixed(2)}×` }]
                : []),
              { label: "Confiance", value: `${(Number(report.confidence) * 100).toFixed(0)}%` },
              { label: "Grade plafonné", value: report.gradeCapped ? "Oui" : "Non" },
            ];
            return (
            <div className="space-y-5">
              {/* Note globale */}
              <div className={`grid gap-3 ${kpis.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-lg border border-gray-200 p-3 text-center">
                    <p className="text-xs text-gray-400">{kpi.label}</p>
                    <p className={`mt-1 text-lg font-bold ${kpi.highlight ? "text-brand-700" : "text-gray-900"}`}>
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recommandation */}
              {snapshot.recommendation && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-medium text-blue-800">Recommandation</p>
                  <p className="mt-1 text-sm text-blue-700">{snapshot.recommendation}</p>
                </div>
              )}

              {/* Quotité d'avance */}
              {snapshot.advanceRate && (
                <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                  <p className="text-xs font-medium text-green-800">Quotité d'avance</p>
                  <p className="mt-1 text-xl font-bold text-green-700">
                    {(snapshot.advanceRate * 100).toFixed(0)}%
                  </p>
                </div>
              )}

              {/* Données manquantes */}
              {snapshot.missingData && snapshot.missingData.length > 0 && (
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                  <p className="mb-2 text-xs font-medium text-orange-800">
                    ⚠ Données manquantes ({snapshot.missingData.length})
                  </p>
                  <ul className="space-y-1">
                    {snapshot.missingData.map((m) => (
                      <li key={m} className="text-xs text-orange-700">· {m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Données déclarées non scorées */}
              {snapshot.nonScoredFields && snapshot.nonScoredFields.length > 0 && (() => {
                const entries = snapshot.nonScoredFields
                  .map((key) => [key, snapshot[key]] as const)
                  .filter(([, value]) => value !== null && value !== undefined && value !== "");
                if (entries.length === 0) return null;
                return (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium text-gray-600">
                      Données déclarées — hors barème pondéré (contexte analyste)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {entries.map(([key, value]) => (
                        <div key={key} className="rounded-md bg-white p-2 text-center">
                          <p className="text-xs text-gray-400">{NON_SCORED_FIELD_LABELS[key] ?? key}</p>
                          <p className="text-xs font-medium text-gray-900">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Analyste */}
              {report.validatedBy && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {report.validatedBy.firstName[0]}{report.validatedBy.lastName[0]}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {report.validatedBy.firstName} {report.validatedBy.lastName}
                    </p>
                    <p className="text-xs text-gray-400">Analyste validateur</p>
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* CRITÈRES */}
          {!isLoading && activeTab === "criteres" && (
            <div className="space-y-4">
              {snapshot?.criteria ? (
                snapshot.criteria.map((criterion) => (
                  <div key={criterion.key} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{criterion.label}</p>
                          {criterion.penalized && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                              Pénalisé
                            </span>
                          )}
                          {!criterion.evaluable && !criterion.penalized && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              Non évalué
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          Poids : {(criterion.weight * 100).toFixed(0)}% · Fiabilité : {(criterion.reliability * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {criterion.rawScore !== null ? criterion.rawScore.toFixed(1) : "—"}
                          <span className="text-xs text-gray-400">/100</span>
                        </p>
                      </div>
                    </div>

                    {/* Barre de score */}
                    {criterion.rawScore !== null && (
                      <div className="mb-3 h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full ${
                            criterion.rawScore >= 80 ? "bg-green-500" :
                            criterion.rawScore >= 60 ? "bg-yellow-400" :
                            "bg-red-400"
                          }`}
                          style={{ width: `${criterion.rawScore}%` }}
                        />
                      </div>
                    )}

                    {/* Détail des sous-indicateurs */}
                    {Object.keys(criterion.detail).length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(criterion.detail).map(([key, value]) => (
                          <div key={key} className="rounded-md bg-gray-50 p-2 text-center">
                            <p className="text-xs text-gray-400">{DETAIL_KEY_LABELS[key] ?? key}</p>
                            <p className="text-xs font-medium text-gray-900">
                              {value !== null ? formatDetailValue(key, value) : "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {criterion.note && (
                      <p className="mt-2 text-xs italic text-gray-400">{criterion.note}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400">
                  Détail par critère non disponible pour ce rapport
                  {/* Détail par critère non disponible pour ce rapport — consultez l'onglet "JSON brut" pour les données de calcul complètes. */}
                </p>
              )}
            </div>
          )}

          {/* JSON BRUT */}
          {!isLoading && activeTab === "json" && snapshot && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Snapshot complet figé — non modifiable après calcul
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
                  }}
                  className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  📋 Copier
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
          <p className="text-xs text-gray-400">
            Ce snapshot est immuable — tout recalcul crée un nouveau rapport.
          </p>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
