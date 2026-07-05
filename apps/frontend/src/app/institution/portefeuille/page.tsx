"use client";

import { useInstitutionData, isRecentlyCreated } from "@/lib/use-institution-data";
import { NotifBell } from "@/components/ui/notif-bell";

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt MLT",
  EQUITY: "Equity",
};

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} M`;
  return `${(v / 1_000).toFixed(0)} K`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// Valeur actuelle = capital + intérêts courus depuis l'engagement (plafonné à la durée totale),
// pas la valeur projetée à l'échéance — sinon un dossier tout juste engagé afficherait déjà son gain final.
function getElapsedMonths(createdAt: string, durationMonths: number | null) {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const elapsedMonths = elapsedMs / (1000 * 60 * 60 * 24 * 30);
  const cap = durationMonths ?? 12;
  return Math.max(0, Math.min(elapsedMonths, cap));
}

function BarChart({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm bg-brand-700 transition-all"
            style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total > 0 ? "4px" : "0" }}
          />
          <p className="text-xs text-gray-400">{d.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function InstitutionPortefeuillePage() {
  const { investments, isLoading, totalDeployed, avgReturn, activeInvestments } =
    useInstitutionData();

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      total: totalDeployed * (0.6 + i * 0.08),
    };
  });

  const estimatedValue = investments
    .filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status))
    .reduce((sum, inv) => {
      const capital = Number(inv.amountCommitted);
      const rate = Number(inv.lockedReturn ?? 0);
      const elapsedMonths = getElapsedMonths(inv.createdAt, inv.fundingRequest.durationMonths);
      return sum + capital + (capital * (rate / 100) * (elapsedMonths / 12));
    }, 0);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Portefeuille institutionnel</p>
          <p className="text-xs text-slate-500">
            {activeInvestments.length} positions actives · Mise à jour en temps réel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            ⬇ Exporter XLSX
          </button>
          <NotifBell href="/institution/notifications" />
        </div>
      </header>

      <div className="p-8 pb-16">
        {/* 4 KPI */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Capital investi", value: `${formatAmount(totalDeployed)} FCFA`, hint: `${totalDeployed.toLocaleString("fr-FR")} F CFA`, icon: "🏛️" },
          { label: "Valeur actuelle", value: `${formatAmount(estimatedValue)} FCFA`, hint: `+${formatAmount(estimatedValue - totalDeployed)} FCFA`, green: true, icon: "📈" },
          { label: "Rendement moyen", value: `${avgReturn.toFixed(1)}%`, hint: "", icon: "📊" },
          { label: "Positions actives", value: String(activeInvestments.length), hint: "+1 ce mois", icon: "✓" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-base">{kpi.icon}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
            {kpi.hint && (
              <p className={`text-xs ${kpi.green ? "text-green-600" : "text-gray-400"}`}>
                {kpi.hint}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Graphique évolution */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-gray-900">
          Évolution des encours (M FCFA)
        </p>
        <BarChart data={monthlyData} />
      </div>

      {/* Tableau positions */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Positions en portefeuille</p>
          <p className="text-xs text-gray-400">Cliquez sur une ligne pour le détail</p>
        </div>
        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && investments.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Aucune position en portefeuille.</p>
          </div>
        )}
        {investments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">PME</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Investi</th>
                  <th className="px-5 py-3 text-right font-medium">Valeur</th>
                  <th className="px-5 py-3 text-center font-medium">Rdt</th>
                  <th className="px-5 py-3 text-left font-medium">Progression</th>
                  <th className="px-5 py-3 text-left font-medium">Statut</th>
                  <th className="px-5 py-3 text-left font-medium">Échéance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {investments.map((inv) => {
                  const capital = Number(inv.amountCommitted);
                  const rate = Number(inv.lockedReturn ?? 0);
                  const elapsedMonths = getElapsedMonths(inv.createdAt, inv.fundingRequest.durationMonths);
                  const estimatedVal = capital + capital * (rate / 100) * (elapsedMonths / 12);
                  const gain = estimatedVal - capital;

                  const requested = Number(inv.fundingRequest.amountRequested);
                  const raised = Number(inv.fundingRequest.amountRaised);
                  const progress = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;

                  const isNew = isRecentlyCreated(inv.createdAt);

                  return (
                    <tr key={inv.id} className="cursor-pointer hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">
                          {inv.fundingRequest.organization.legalName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {inv.fundingRequest.organization.sector}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {CATEGORY_LABELS[inv.fundingRequest.category] ?? inv.fundingRequest.category}
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                        {formatAmount(capital)} FCFA
                      </td>
                      <td className="px-5 py-3 text-right text-xs">
                        <p className="font-medium text-gray-900">{formatAmount(estimatedVal)} FCFA</p>
                        {gain > 0 && (
                          <p className="text-green-600">+{formatAmount(gain)} M</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center text-xs font-bold text-green-600">
                        {rate > 0 ? `${rate}%` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full bg-brand-700"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{progress.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isNew ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {isNew ? "Nouveau" : "En cours"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatDate(inv.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
