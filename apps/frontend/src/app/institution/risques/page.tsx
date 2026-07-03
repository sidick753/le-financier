"use client";

import { useState } from "react";

type RisqueTab = "prudentiels" | "reglementaires" | "aml";

const INDICATEURS = [
  {
    code: "NPL",
    label: "Taux de créances douteuses (NPL)",
    description: "Ratio des créances non performantes sur encours total",
    value: 1.2,
    unit: "%",
    seuil: 5,
    seuilLabel: "Seuil BCEAO : 5%",
    status: "conforme",
    plusBas: true,
  },
  {
    code: "LCR",
    label: "Ratio de liquidité (LCR)",
    description: "Couverture des sorties nettes de trésorerie sur 30 jours",
    value: 142,
    unit: "%",
    seuil: 100,
    seuilLabel: "Seuil BCEAO : 100%",
    status: "conforme",
    plusBas: false,
  },
  {
    code: "CAR",
    label: "Ratio de solvabilité (CAR)",
    description: "Fonds propres pondérés sur les risques (Bâle III)",
    value: 13.4,
    unit: "%",
    seuil: 11.5,
    seuilLabel: "Seuil BCEAO : 11.5%",
    status: "conforme",
    plusBas: false,
  },
  {
    code: "CONC",
    label: "Concentration sectorielle max.",
    description: "Part maximale d'un secteur dans l'encours total",
    value: 44,
    unit: "%",
    seuil: 50,
    seuilLabel: "Seuil BCEAO : 50%",
    status: "attention",
    plusBas: true,
  },
  {
    code: "COVER",
    label: "Taux de couverture des garanties",
    description: "Ratio de sûretés réelles sur encours financés",
    value: 87,
    unit: "%",
    seuil: 80,
    seuilLabel: "Seuil BCEAO : 80%",
    status: "attention",
    plusBas: false,
  },
  {
    code: "LEV",
    label: "Ratio de levier",
    description: "Rapport fonds propres / total actif (plafond BCEAO)",
    value: 6.2,
    unit: "x",
    seuil: 8,
    seuilLabel: "Seuil BCEAO : 8x",
    status: "conforme",
    plusBas: true,
  },
];

const RAPPORTS = [
  { label: "Rapport prudentiel T2 2026", deadline: "30/06/2026", progress: 85, status: "urgent" },
  { label: "Déclaration LAB-CFT S1 2026", deadline: "15/07/2026", progress: 40, status: "en_cours" },
  { label: "Statistiques marché PME", deadline: "01/07/2026", progress: 100, status: "soumis" },
];

export default function RisquesPage() {
  const [tab, setTab] = useState<RisqueTab>("prudentiels");

  const conformes = INDICATEURS.filter((i) => i.status === "conforme").length;
  const attentions = INDICATEURS.filter((i) => i.status === "attention").length;
  const violations = INDICATEURS.filter((i) => i.status === "violation").length;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Risques & Conformité</h1>
          <p className="text-sm text-gray-500">Tableau de bord prudentiel · BCEAO / Bâle III</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            🔄 Actualiser
          </button>
          <button className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            ⬇ Exporter rapport
          </button>
        </div>
      </div>

      {/* Alertes */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-xs text-red-800">
            🔴 <strong>Rapport BCEAO T2 2026</strong> à soumettre d'ici 17 jours (30/06/2026)
          </p>
          <button className="text-xs text-red-700 underline">Compléter maintenant</button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>Garantie AGRO MORONOU</strong> expire le 20/06/2026 — Renouvellement requis
          </p>
          <button className="text-xs text-yellow-700 underline">Voir dossier</button>
        </div>
      </div>

      {/* 3 stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Indicateurs conformes", value: `${conformes}/${INDICATEURS.length}`, icon: "✓", color: "text-green-600", bg: "bg-green-50 border-green-200", iconBg: "bg-green-100" },
          { label: "Points d'attention", value: `${attentions}/${INDICATEURS.length}`, icon: "⚠", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", iconBg: "bg-yellow-100" },
          { label: "Violations critiques", value: `${violations}/${INDICATEURS.length}`, icon: "⊗", color: "text-red-600", bg: "bg-red-50 border-red-200", iconBg: "bg-red-100" },
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
          {INDICATEURS.map((ind) => {
            const isConforme = ind.status === "conforme";
            const isAttention = ind.status === "attention";
            const progress = ind.plusBas
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
                      Valeur actuelle : <strong>{ind.value}{ind.unit}</strong>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isConforme ? "bg-green-100 text-green-700" :
                      isAttention ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {isConforme ? "✓ Conforme" : isAttention ? "⚠ Attention" : "⊗ Violation"}
                    </span>
                    <p className={`text-xl font-bold ${
                      isConforme ? "text-green-600" :
                      isAttention ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {ind.value}{ind.unit}
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
        <div className="space-y-4">
          {RAPPORTS.map((r) => (
            <div key={r.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-400">À soumettre avant le {r.deadline}</p>
                </div>
                <button className={`rounded-md px-3 py-1 text-xs font-medium ${
                  r.status === "soumis" ? "bg-green-100 text-green-700" :
                  r.status === "urgent" ? "bg-red-100 text-red-700" :
                  "bg-orange-100 text-orange-700"
                }`}>
                  {r.status === "soumis" ? "Voir" : r.status === "urgent" ? "Compléter" : "Continuer"}
                </button>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full ${
                    r.status === "soumis" ? "bg-green-500" :
                    r.status === "urgent" ? "bg-brand-700" :
                    "bg-orange-400"
                  }`}
                  style={{ width: `${r.progress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-gray-400">{r.progress}%</p>
            </div>
          ))}
        </div>
      )}

      {/* AML */}
      {tab === "aml" && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-700">Module Anti-blanchiment (AML)</p>
          <p className="mt-2 text-xs text-gray-400">
            Le suivi automatisé LAB-CFT avec screening des contreparties et déclarations CENTIF sera disponible dans une prochaine version.
          </p>
        </div>
      )}
    </div>
  );
}
