"use client";

import { useGainsData } from "@/lib/use-gains-data";

const NATURE_LABELS: Record<string, string> = {
  INTEREST: "Intérêts",
  INSTALLMENT: "Mensualité",
  FINAL_PAYMENT: "Solde final",
};

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt",
  EQUITY: "Equity",
};

function formatAmount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("fr-FR");
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function BarChart({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md bg-blue-500 transition-all"
            style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total > 0 ? "4px" : "0" }}
          />
          <p className="text-xs text-gray-400">{d.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function GainsPage() {
  const {
    upcoming,
    payments,
    isLoading,
    totalRevenues,
    totalInterests,
    revenuesThisMonth,
    nextDue,
    avgRate,
    monthlyRevenues,
  } = useGainsData();

  const currentYear = new Date().getFullYear();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gains & Revenus</h1>
        <p className="text-sm text-gray-500">
          Historique de vos revenus et prochaines échéances
        </p>
      </div>

      {/* 6 stats */}
      <div className="mb-6 grid grid-cols-6 gap-3">
        <StatCard
          label="Revenus totaux"
          value={isLoading ? "…" : `${formatAmount(totalRevenues)} FCFA`}
          icon="💼"
        />
        <StatCard
          label="Revenus ce mois"
          value={isLoading ? "…" : `${formatAmount(revenuesThisMonth)} FCFA`}
          icon="📈"
          green={revenuesThisMonth > 0}
        />
        <StatCard
          label="Prochaine échéance"
          value={
            isLoading
              ? "…"
              : nextDue
                ? `${formatAmount(Number(nextDue.amountDue))} FCFA`
                : "—"
          }
          hint={nextDue ? formatDate(nextDue.dueDate) : "Aucune à venir"}
          icon="📅"
        />
        <StatCard
          label="Taux moyen"
          value={isLoading ? "…" : avgRate > 0 ? `${avgRate.toFixed(2)}%` : "—"}
          icon="📊"
          green={avgRate > 0}
        />
        <StatCard
          label="TRI annualisé"
          value="—"
          hint="Calcul disponible bientôt"
          icon="📉"
          muted
        />
        <StatCard
          label={`Gains cumulés ${currentYear}`}
          value={isLoading ? "…" : `${formatAmount(totalInterests)} FCFA`}
          icon="✅"
          green={totalInterests > 0}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Graphique revenus mensuels */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">
            Revenus mensuels {currentYear}
          </p>
          {isLoading ? (
            <div className="h-40 animate-pulse rounded bg-gray-100" />
          ) : (
            <BarChart data={monthlyRevenues} />
          )}
        </div>

        {/* Prochaines échéances */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">Prochaines échéances</p>
          {isLoading && <p className="text-xs text-gray-400">Chargement...</p>}
          {!isLoading && upcoming.length === 0 && (
            <p className="text-xs text-gray-400">Aucune échéance à venir.</p>
          )}
          <div className="space-y-3">
            {upcoming.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs">
                  📅
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-900">
                    {item.fundingRequest.organization.legalName}
                  </p>
                  <p className="text-xs font-medium text-green-600">
                    {Number(item.amountDue).toLocaleString("fr-FR")} F CFA
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(item.dueDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historique des paiements */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Historique des paiements</p>
        </div>

        {!isLoading && payments.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Aucun paiement reçu pour le moment.</p>
            <p className="mt-1 text-xs text-gray-400">
              Les paiements apparaîtront ici dès qu'une PME aura confirmé un remboursement.
            </p>
          </div>
        )}

        {payments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">PME</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Nature</th>
                  <th className="px-5 py-3 text-right font-medium">Montant</th>
                  <th className="px-5 py-3 text-center font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDate(payment.paidAt)}
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-gray-900">
                      {payment.repaymentSchedule.fundingRequest.organization.legalName}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {CATEGORY_LABELS[payment.repaymentSchedule.fundingRequest.category] ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {NATURE_LABELS[payment.repaymentSchedule.nature] ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-semibold text-green-600">
                      {Number(payment.amountPaid).toLocaleString("fr-FR")} F CFA
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Reçu
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Résumé fiscal */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-1 text-sm font-semibold text-gray-900">Résumé fiscal {currentYear}</p>
        <p className="mb-3 text-xs text-gray-500">
          Revenus imposables {currentYear} (à ce jour)
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {totalInterests.toLocaleString("fr-FR")} FCFA
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Les revenus de crowdlending sont soumis à l&apos;IRPP. Consultez votre conseiller fiscal.
        </p>
        <button
          onClick={() => alert("Génération du relevé fiscal à venir.")}
          className="mt-4 flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ⬇ Télécharger relevé fiscal
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  green,
  muted,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  green?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        <span className="text-base">{icon}</span>
      </div>
      <p
        className={`text-base font-bold ${
          green ? "text-green-600" : muted ? "text-gray-300" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
