"use client";

import { useInstitutionData, GRADE_CLASSNAMES } from "@/lib/use-institution-data";
import { useRouter } from "next/navigation";

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt MLT",
  EQUITY: "Equity",
};

const STATUS_PIPELINE: Record<string, { label: string; className: string }> = {
  NEGOTIATING: { label: "En analyse", className: "bg-yellow-100 text-yellow-700" },
  COMMITTED: { label: "Approuvé", className: "bg-green-100 text-green-700" },
  SETTLED_OFF_PLATFORM: { label: "Réglé", className: "bg-blue-100 text-blue-700" },
  INTERESTED: { label: "Due diligence", className: "bg-purple-100 text-purple-700" },
};

// Assignation illustrative — la gestion réelle des analystes arrive avec la page Équipe (cf. équipe/page.tsx)
const PIPELINE_ANALYSTS = ["K. Assoumou", "M. Touré"];

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} M`;
  return `${(v / 1_000).toFixed(0)} K`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InstitutionOverviewPage() {
  const { investments, isLoading, totalDeployed, activeInvestments, avgReturn, byCategory } =
    useInstitutionData();
  const router = useRouter();

  const totalByCategory = Object.values(byCategory).reduce((s, v) => s + v, 0);

  return (
    <div className="p-8">
      {/* Alertes */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>Garantie en portefeuille</strong> — Vérifiez vos couvertures de garantie.
          </p>
          <button className="text-xs text-yellow-700 underline">Voir dossier</button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-xs text-red-800">
            🔴 <strong>Rapport BCEAO trimestriel</strong> à soumettre avant le 30/06/2026
          </p>
          <button onClick={() => router.push("/institution/risques")} className="text-xs text-red-700 underline">
            Compléter
          </button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <p className="text-xs text-blue-800">
            ⭐ <strong>Nouvelle opportunité premium</strong> disponible dans le Deal Flow
          </p>
          <button onClick={() => router.push("/institution/deal-flow")} className="text-xs text-blue-700 underline">
            Consulter
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vue d'ensemble</h1>
          <p className="text-sm text-gray-500">Tableau de bord institutionnel</p>
        </div>
        <button
          onClick={() => router.push("/institution/deal-flow")}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + Nouveau dossier
        </button>
      </div>

      {/* 4 KPI */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard
          label="Encours déployés"
          value={isLoading ? "…" : `${formatAmount(totalDeployed)} FCFA`}
          hint={`${totalDeployed.toLocaleString("fr-FR")} F CFA`}
          icon="🏛️"
          trend="+1.8% vs trim. précédent"
          trendUp
        />
        <KpiCard
          label="Dossiers actifs"
          value={isLoading ? "…" : String(activeInvestments.length)}
          hint="PME partenaires"
          icon="📋"
          trend={`+${Math.max(0, activeInvestments.length - 30)} ce mois`}
          trendUp
        />
        <KpiCard
          label="Rendement net moyen"
          value={isLoading ? "…" : `${avgReturn.toFixed(1)}%`}
          hint="Après provisions LCR"
          icon="📈"
          trend="-0.3% vs objectif"
          trendUp={false}
        />
        <KpiCard
          label="Taux de défaut (NPL)"
          value="1.2%"
          hint="Seuil BCEAO : 5%"
          icon="✓"
          trend="Conforme"
          trendUp
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Pipeline récent */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-900">Pipeline récent</p>
            <button
              onClick={() => router.push("/institution/deal-flow")}
              className="text-xs text-brand-700 hover:underline"
            >
              Voir tout →
            </button>
          </div>
          {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
          {!isLoading && investments.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400">Aucun dossier en pipeline.</p>
              <button
                onClick={() => router.push("/institution/deal-flow")}
                className="mt-2 text-xs text-brand-700 hover:underline"
              >
                Explorer les opportunités →
              </button>
            </div>
          )}
          {investments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="px-5 py-3 text-left font-medium">Dossier</th>
                    <th className="px-5 py-3 text-left font-medium">Type</th>
                    <th className="px-5 py-3 text-right font-medium">Montant</th>
                    <th className="px-5 py-3 text-center font-medium">Note</th>
                    <th className="px-5 py-3 text-center font-medium">Score</th>
                    <th className="px-5 py-3 text-left font-medium">Statut</th>
                    <th className="px-5 py-3 text-left font-medium">Analyste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {investments.slice(0, 5).map((inv, i) => {
                    const statusConfig =
                      STATUS_PIPELINE[inv.status] ?? STATUS_PIPELINE.NEGOTIATING;
                    const report = inv.fundingRequest.scoringReports[0];
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">
                            {inv.fundingRequest.organization.legalName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(inv.createdAt)}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600">
                          {CATEGORY_LABELS[inv.fundingRequest.category] ?? inv.fundingRequest.category}
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                          {formatAmount(Number(inv.amountCommitted))} FCFA
                        </td>
                        <td className="px-5 py-3 text-center">
                          {report?.grade ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${GRADE_CLASSNAMES[report.grade] ?? "bg-gray-100 text-gray-600"}`}>
                              {report.grade}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center text-xs font-medium text-gray-900">
                          {report ? `${Math.round(Number(report.autoScore))}` : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600">
                          {PIPELINE_ANALYSTS[i % PIPELINE_ANALYSTS.length]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Répartition encours */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="mb-4 text-sm font-semibold text-gray-900">Répartition encours</p>
            {Object.keys(byCategory).length === 0 ? (
              <p className="text-xs text-gray-400">Aucun encours actif.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byCategory).map(([cat, amount]) => {
                  const pct = totalByCategory > 0
                    ? Math.round((amount / totalByCategory) * 100)
                    : 0;
                  const colors: Record<string, string> = {
                    FACTURE: "bg-brand-700",
                    PRET: "bg-green-500",
                    EQUITY: "bg-orange-400",
                  };
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-gray-700">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <span className="font-medium text-gray-900">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full ${colors[cat] ?? "bg-brand-700"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accès rapide */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">Accès rapide</p>
            <div className="space-y-2">
              {[
                { icon: "📄", label: "Rapport BCEAO Q2 2026", hint: "À soumettre avant 30/06", href: "/institution/risques", urgent: true },
                { icon: "📊", label: "Analyse de portefeuille", hint: "Dernière MàJ aujourd'hui", href: "/institution/portefeuille" },
                { icon: "👥", label: "Gestion des analystes", hint: "4 membres actifs", href: "/institution/equipe" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-gray-50"
                >
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.urgent ? "bg-red-100" : "bg-gray-100"}`}>
                    {item.icon}
                  </span>
                  <div>
                    <p className={`text-xs font-medium ${item.urgent ? "text-red-700" : "text-gray-900"}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-400">{item.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-gray-900">Activité récente</p>
        {investments.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune activité récente.</p>
        ) : (
          <div className="space-y-3">
            {investments.slice(0, 4).map((inv) => (
              <div key={inv.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                  <span className="text-xs text-green-600">✓</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    Engagement sur {inv.fundingRequest.organization.legalName} —{" "}
                    {CATEGORY_LABELS[inv.fundingRequest.category]} {formatAmount(Number(inv.amountCommitted))}M
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(inv.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint, icon, trend, trendUp }: {
  label: string; value: string; hint: string; icon: string; trend: string; trendUp: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-base">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
      <p className={`mt-1 text-xs font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
        {trend}
      </p>
    </div>
  );
}
