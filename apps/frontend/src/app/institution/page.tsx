"use client";

import { ReactNode } from "react";
import { useInstitutionData, isRecentlyCreated, GRADE_CLASSNAMES } from "@/lib/use-institution-data";
import { useInstitutionSettings } from "@/lib/use-institution-settings";
import { useInstitutionBadges } from "@/lib/institution-badges-context";
import { computeIndicatorStatus } from "@/lib/risk-indicators";
import { useRouter } from "next/navigation";
import { NotifBell } from "@/components/ui/notif-bell";
import { useSortableRows } from "@/lib/use-sortable-rows";
import { SortableTh } from "@/components/ui/sortable-th";
import { formatCompactAmount } from "@/lib/admin-ui";

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt MLT",
  EQUITY: "Equity",
};

const STATUS_PIPELINE: Record<string, { label: string; className: string }> = {
  INTERESTED: { label: "Due diligence", className: "bg-purple-100 text-purple-700" },
  NEGOTIATING: { label: "En analyse", className: "bg-yellow-100 text-yellow-700" },
  COMMITTED: { label: "Approuvé", className: "bg-green-100 text-green-700" },
  SETTLEMENT_SUBMITTED: { label: "Virement en validation", className: "bg-indigo-100 text-indigo-700" },
  SETTLED_OFF_PLATFORM: { label: "Réglé", className: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Annulé", className: "bg-gray-100 text-gray-500" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
};

type AlertTone = "red" | "yellow" | "blue";

interface DashboardAlert {
  id: string;
  tone: AlertTone;
  message: ReactNode;
  actionLabel: string;
  onAction: () => void;
}

const ALERT_TONE_CLASSNAMES: Record<AlertTone, { box: string; text: string; action: string }> = {
  red: { box: "border-red-200 bg-red-50", text: "text-red-800", action: "text-red-700" },
  yellow: { box: "border-yellow-200 bg-yellow-50", text: "text-yellow-800", action: "text-yellow-700" },
  blue: { box: "border-blue-200 bg-blue-50", text: "text-blue-800", action: "text-blue-700" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InstitutionOverviewPage() {
  const { investments, opportunities, isLoading, totalDeployed, activeInvestments, avgReturn, byCategory } =
    useInstitutionData();
  const { riskIndicators, amlStats, members, isLoading: isSettingsLoading } = useInstitutionSettings();
  const { badges } = useInstitutionBadges();
  const router = useRouter();

  const totalByCategory = Object.values(byCategory).reduce((s, v) => s + v, 0);

  const engagedFundingRequestIds = new Set(investments.map((inv) => inv.fundingRequest.id));
  const newOpportunities = opportunities.filter(
    (opp) => isRecentlyCreated(opp.createdAt) && !engagedFundingRequestIds.has(opp.id),
  );

  const nplIndicator = riskIndicators?.npl;
  const nplValue = nplIndicator?.disponible && nplIndicator.value !== null ? nplIndicator.value : null;
  const nplStatus = nplValue !== null ? computeIndicatorStatus(nplValue, 5, true) : "non_disponible";

  const garantiesIndicator = riskIndicators?.couvertureGaranties;
  const garantiesValue =
    garantiesIndicator?.disponible && garantiesIndicator.value !== null ? garantiesIndicator.value : null;
  const garantiesStatus = garantiesValue !== null ? computeIndicatorStatus(garantiesValue, 80, false) : "non_disponible";

  const now = new Date();
  const activeThisMonth = activeInvestments.filter((inv) => {
    const d = new Date(inv.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const pendingNegotiations = investments.filter((inv) => {
    const last = inv.negotiationOffers[0];
    return last?.proposedBy === "PME" && last?.status === "PENDING";
  });

  const alerts: DashboardAlert[] = [];
  if (amlStats.alertesActives > 0) {
    const n = amlStats.alertesActives;
    alerts.push({
      id: "aml",
      tone: "red",
      message: (
        <>
          🔴 <strong>{n} alerte{n > 1 ? "s" : ""} AML / LAB-CFT active{n > 1 ? "s" : ""}</strong> — nécessite
          {n > 1 ? "nt" : ""} une revue.
        </>
      ),
      actionLabel: "Voir",
      onAction: () => router.push("/institution/risques?tab=aml"),
    });
  }
  if (garantiesStatus === "violation" || garantiesStatus === "attention") {
    alerts.push({
      id: "garanties",
      tone: garantiesStatus === "violation" ? "red" : "yellow",
      message: (
        <>
          ⚠️ <strong>Couverture des garanties</strong> à {garantiesValue}% — sous le seuil BCEAO (80%).
        </>
      ),
      actionLabel: "Voir détail",
      onAction: () => router.push("/institution/risques"),
    });
  }
  if (badges.portefeuille > 0) {
    const n = badges.portefeuille;
    alerts.push({
      id: "negociations",
      tone: "yellow",
      message: (
        <>
          📨 <strong>{n} négociation{n > 1 ? "s" : ""} en attente</strong> de votre réponse.
        </>
      ),
      actionLabel: "Répondre",
      onAction: () =>
        pendingNegotiations.length === 1
          ? router.push(`/institution/deal-flow/${pendingNegotiations[0].fundingRequest.id}`)
          : router.push("/institution/portefeuille"),
    });
  }
  if (newOpportunities.length > 0) {
    const n = newOpportunities.length;
    alerts.push({
      id: "opportunites",
      tone: "blue",
      message: (
        <>
          ⭐ <strong>{n} nouvelle{n > 1 ? "s" : ""} opportunité{n > 1 ? "s" : ""}</strong> disponible
          {n > 1 ? "s" : ""} dans le Deal Flow.
        </>
      ),
      actionLabel: "Consulter",
      onAction: () => router.push("/institution/deal-flow"),
    });
  }
  const alertsLoading = isLoading || isSettingsLoading;

  const { sortedRows: sortedInvestments, sortKey, direction, toggleSort } = useSortableRows(
    investments,
    {
      pme: (inv) => inv.fundingRequest.organization.legalName,
      category: (inv) => inv.fundingRequest.category,
      amount: (inv) => Number(inv.amountCommitted),
      grade: (inv) => inv.fundingRequest.scoringReports[0]?.grade ?? "",
      score: (inv) => {
        const report = inv.fundingRequest.scoringReports[0];
        return report ? Number(report.autoScore) : null;
      },
      status: (inv) => inv.status,
    },
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Vue d'ensemble</p>
          <p className="text-xs text-slate-500">Tableau de bord institutionnel</p>
        </div>
        <div className="flex items-center gap-3">
          <NotifBell href="/institution/notifications" />
        </div>
      </header>

      <div className="p-8 pb-16">
        {/* Alertes */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert) => {
              const tone = ALERT_TONE_CLASSNAMES[alert.tone];
              return (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${tone.box}`}
                >
                  <p className={`text-xs ${tone.text}`}>{alert.message}</p>
                  <button onClick={alert.onAction} className={`text-xs underline ${tone.action}`}>
                    {alert.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 4 KPI */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard
          label="Encours déployés"
          value={isLoading ? "…" : `${formatCompactAmount(totalDeployed)} FCFA`}
          hint={`${totalDeployed.toLocaleString("fr-FR")} F CFA`}
          icon="🏛️"
        />
        <KpiCard
          label="Dossiers actifs"
          value={isLoading ? "…" : String(activeInvestments.length)}
          hint="PME partenaires"
          icon="📋"
          trend={isLoading ? undefined : `+${activeThisMonth} ce mois`}
          trendUp
        />
        <KpiCard
          label="Rendement net moyen"
          value={isLoading ? "…" : `${avgReturn.toFixed(1)}%`}
          hint="Après provisions LCR"
          icon="📈"
        />
        <KpiCard
          label="Taux de défaut (NPL)"
          value={alertsLoading ? "…" : nplValue !== null ? `${nplValue}%` : "N/D"}
          hint="Seuil BCEAO : 5%"
          icon="✓"
          trend={
            alertsLoading || nplValue === null
              ? undefined
              : nplStatus === "conforme"
                ? "Conforme"
                : nplStatus === "attention"
                  ? "Attention"
                  : "Violation"
          }
          trendUp={nplStatus === "conforme"}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Pipeline récent */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <p className="text-lg font-bold text-gray-900">Pipeline récent</p>
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
                    <SortableTh label="Dossier" sortKey="pme" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                    <SortableTh label="Type" sortKey="category" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                    <SortableTh label="Montant" sortKey="amount" currentKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                    <SortableTh label="Note" sortKey="grade" currentKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                    <SortableTh label="Score" sortKey="score" currentKey={sortKey} direction={direction} onSort={toggleSort} align="center" />
                    <SortableTh label="Statut" sortKey="status" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedInvestments.slice(0, 5).map((inv) => {
                    const statusConfig =
                      STATUS_PIPELINE[inv.status] ?? { label: inv.status, className: "bg-gray-100 text-gray-500" };
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
                          {formatCompactAmount(Number(inv.amountCommitted))} FCFA
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
            <p className="mb-4 text-lg font-bold text-gray-900">Répartition encours</p>
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
            <p className="mb-3 text-lg font-bold text-gray-900">Accès rapide</p>
            <div className="space-y-2">
              {[
                {
                  icon: "🛡️",
                  label: "Alertes AML / LAB-CFT",
                  hint: isSettingsLoading
                    ? "…"
                    : amlStats.alertesActives > 0
                      ? `${amlStats.alertesActives} alerte${amlStats.alertesActives > 1 ? "s" : ""} active${amlStats.alertesActives > 1 ? "s" : ""}`
                      : "Aucune alerte active",
                  href: "/institution/risques",
                  urgent: amlStats.alertesActives > 0,
                },
                { icon: "📊", label: "Analyse de portefeuille", hint: "Suivi de la performance", href: "/institution/portefeuille" },
                {
                  icon: "👥",
                  label: "Gestion des analystes",
                  hint: isSettingsLoading ? "…" : `${members.length} membre${members.length > 1 ? "s" : ""} actif${members.length > 1 ? "s" : ""}`,
                  href: "/institution/equipe",
                },
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
        <p className="mb-4 text-lg font-bold text-gray-900">Activité récente</p>
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
                    {CATEGORY_LABELS[inv.fundingRequest.category]} {formatCompactAmount(Number(inv.amountCommitted))} FCFA
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(inv.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, hint, icon, trend, trendUp }: {
  label: string; value: string; hint: string; icon: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-base">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
      {trend && (
        <p className={`mt-1 text-xs font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
          {trend}
        </p>
      )}
    </div>
  );
}
