"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useInstitutionSettings,
  type RiskIndicators,
  type AmlAlertType,
  type AmlAlertStatus,
} from "@/lib/use-institution-settings";
import { useInstitutionBadges } from "@/lib/institution-badges-context";
import { NotifBell } from "@/components/ui/notif-bell";
import { useSortableRows } from "@/lib/use-sortable-rows";
import { SortableTh } from "@/components/ui/sortable-th";
import { computeIndicatorStatus, type IndicatorStatus } from "@/lib/risk-indicators";

const AML_TYPE_LABELS: Record<AmlAlertType, string> = {
  TRANSACTION_INHABITUELLE: "Transaction inhabituelle",
  PEP_DETECTE: "PEP détecté (screening)",
  BENEFICIAIRE_NON_IDENTIFIE: "Bénéficiaire tiers non identifié",
};

const AML_STATUS_CONFIG: Record<AmlAlertStatus, { label: string; className: string }> = {
  EN_ANALYSE: { label: "En analyse", className: "bg-yellow-100 text-yellow-700" },
  BLOQUE: { label: "Bloqué", className: "bg-red-100 text-red-700" },
  RESOLU: { label: "Résolu", className: "bg-green-100 text-green-700" },
};

function formatMontantAml(v: string | null) {
  if (v === null) return "—";
  const n = Number(v);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md FCFA`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M FCFA`;
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function formatDateAml(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

type RisqueTab = "prudentiels" | "reglementaires" | "aml";

interface IndicatorDef {
  code: string;
  label: string;
  description: string;
  unit: string;
  seuil: number;
  seuilLabel: string;
  plusBas: boolean;
  key: keyof RiskIndicators;
}

const INDICATOR_DEFS: IndicatorDef[] = [
  {
    code: "NPL",
    label: "Taux de créances douteuses (NPL)",
    description: "Part des échéances de remboursement en retard parmi les dossiers financés par votre équipe",
    unit: "%",
    seuil: 5,
    seuilLabel: "Seuil BCEAO : 5%",
    plusBas: true,
    key: "npl",
  },
  {
    code: "CONC",
    label: "Concentration sectorielle max.",
    description: "Part maximale d'un secteur dans l'encours total financé par votre équipe",
    unit: "%",
    seuil: 50,
    seuilLabel: "Seuil BCEAO : 50%",
    plusBas: true,
    key: "concentrationSectorielle",
  },
  {
    code: "COVER",
    label: "Taux de couverture des garanties",
    description: "Couverture moyenne des garanties sur les Prêts MLT financés (déclarée à l'origination)",
    unit: "%",
    seuil: 80,
    seuilLabel: "Seuil BCEAO : 80%",
    plusBas: false,
    key: "couvertureGaranties",
  },
];

export default function RisquesPage() {
  return (
    <Suspense fallback={null}>
      <RisquesPageContent />
    </Suspense>
  );
}

function RisquesPageContent() {
  const searchParams = useSearchParams();
  const { riskIndicators, amlAlerts, amlStats, isLoading, refresh, resolveAmlAlert } = useInstitutionSettings();
  const { refreshBadges } = useInstitutionBadges();
  const [tab, setTab] = useState<RisqueTab>(searchParams.get("tab") === "aml" ? "aml" : "prudentiels");

  const indicateurs = INDICATOR_DEFS.map((def) => {
    const data = riskIndicators?.[def.key];
    if (!data || !data.disponible || data.value === null) {
      return { ...def, value: null, status: "non_disponible" as IndicatorStatus };
    }
    return { ...def, value: data.value, status: computeIndicatorStatus(data.value, def.seuil, def.plusBas) };
  });

  const conformes = indicateurs.filter((i) => i.status === "conforme").length;
  const attentions = indicateurs.filter((i) => i.status === "attention").length;
  const violations = indicateurs.filter((i) => i.status === "violation").length;

  const { sortedRows: sortedAmlAlerts, sortKey, direction, toggleSort } = useSortableRows(
    amlAlerts,
    {
      client: (a) => a.clientLabel,
      type: (a) => AML_TYPE_LABELS[a.alertType],
      amount: (a) => (a.amount === null ? null : Number(a.amount)),
      detectedAt: (a) => a.detectedAt,
      status: (a) => a.status,
    },
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Risques & Conformité</p>
          <p className="text-xs text-slate-500">Tableau de bord prudentiel · BCEAO / Bâle III</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refresh()}
            className="rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            🔄 Actualiser
          </button>
          <button className="rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            ⬇ Exporter rapport
          </button>
          <NotifBell href="/institution/notifications" />
        </div>
      </header>

      <div className="p-8 pb-16">
        {/* 3 stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Indicateurs conformes", value: `${conformes}/${indicateurs.length}`, icon: "✓", color: "text-green-600", bg: "bg-green-50 border-green-200", iconBg: "bg-green-100" },
          { label: "Points d'attention", value: `${attentions}/${indicateurs.length}`, icon: "⚠", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", iconBg: "bg-yellow-100" },
          { label: "Violations critiques", value: `${violations}/${indicateurs.length}`, icon: "⊗", color: "text-red-600", bg: "bg-red-50 border-red-200", iconBg: "bg-red-100" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-5 ${s.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${s.color} ${s.iconBg}`}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="mb-6 flex border-b border-gray-200">
        {[
          { id: "prudentiels", label: "Indicateurs prudentiels" },
          { id: "reglementaires", label: "Rapports réglementaires" },
          { id: "aml", label: "Anti-blanchiment (AML)" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as RisqueTab)}
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

      {/* Indicateurs prudentiels */}
      {tab === "prudentiels" && (
        <div className="space-y-4">
          {isLoading && <p className="text-center text-sm text-gray-400">Chargement...</p>}
          {!isLoading && indicateurs.map((ind) => {
            const isConforme = ind.status === "conforme";
            const isAttention = ind.status === "attention";
            const isNonDisponible = ind.status === "non_disponible";
            const progress =
              ind.value === null
                ? 0
                : ind.plusBas
                ? Math.min(100, (ind.value / ind.seuil) * 100)
                : Math.min(100, (ind.value / (ind.seuil * 1.5)) * 100);

            return (
              <div key={ind.code} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono font-semibold text-gray-600">
                        {ind.code}
                      </span>
                      <p className="text-sm font-semibold text-gray-900">{ind.label}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">{ind.description}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Valeur actuelle :{" "}
                      <strong>{ind.value !== null ? `${ind.value}${ind.unit}` : "Non disponible"}</strong>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isConforme ? "bg-green-100 text-green-700" :
                      isAttention ? "bg-yellow-100 text-yellow-700" :
                      isNonDisponible ? "bg-gray-100 text-gray-500" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {isConforme ? "✓ Conforme" : isAttention ? "⚠ Attention" : isNonDisponible ? "Non disponible" : "⊗ Violation"}
                    </span>
                    <p className={`text-xl font-bold ${
                      isConforme ? "text-green-600" :
                      isAttention ? "text-yellow-600" :
                      isNonDisponible ? "text-gray-400" :
                      "text-red-600"
                    }`}>
                      {ind.value !== null ? `${ind.value}${ind.unit}` : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${
                          isConforme ? "bg-brand-700" :
                          isAttention ? "bg-yellow-400" :
                          isNonDisponible ? "bg-gray-200" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="w-32 text-right text-xs text-gray-400">{ind.seuilLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rapports réglementaires */}
      {tab === "reglementaires" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
          <p className="text-sm font-medium text-gray-700">Bientôt disponible</p>
          <p className="mt-1 text-sm text-gray-400">
            Le suivi des rapports réglementaires (BCEAO, LAB-CFT, statistiques marché) arrive prochainement.
          </p>
        </div>
      )}

      {/* AML */}
      {tab === "aml" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Alertes actives</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">⚠</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{amlStats.alertesActives}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Cas bloqués</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">🔒</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{amlStats.casBloques}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Résolus ce mois</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600">✓</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{amlStats.resolusCeMois}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-5">
              <p className="text-base font-semibold text-gray-900">Alertes AML / LAB-CFT</p>
            </div>
            {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
            {!isLoading && amlAlerts.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Aucune alerte.</p>
            )}
            {amlAlerts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                      <SortableTh label="Client / Contrepartie" sortKey="client" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                      <SortableTh label="Type d'alerte" sortKey="type" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                      <SortableTh label="Montant" sortKey="amount" currentKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                      <SortableTh label="Date" sortKey="detectedAt" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                      <SortableTh label="Statut" sortKey="status" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedAmlAlerts.map((alert) => {
                      const statusConfig = AML_STATUS_CONFIG[alert.status];
                      return (
                        <tr key={alert.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">{alert.clientLabel}</td>
                          <td className="px-5 py-3 text-xs text-gray-600">{AML_TYPE_LABELS[alert.alertType]}</td>
                          <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                            {formatMontantAml(alert.amount)}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">{formatDateAml(alert.detectedAt)}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {alert.status !== "RESOLU" && (
                              <button
                                onClick={() => resolveAmlAlert(alert.id).then(refreshBadges)}
                                className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Traiter
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">Obligation de déclaration CENTIF</p>
            <p className="mt-1 text-xs text-blue-800">
              Tout cas non résolu dans les 48h doit faire l&apos;objet d&apos;une déclaration de soupçon auprès de la
              Cellule Nationale de Traitement des Informations Financières (CENTIF), conformément à la loi UEMOA
              n°2023-004.
            </p>
            <button className="mt-3 rounded-md bg-blue-900 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800">
              Accéder au portail CENTIF
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
