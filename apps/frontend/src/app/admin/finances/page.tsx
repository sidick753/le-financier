"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Commission {
  id: string;
  type: string;
  commissionAmount: string;
  baseAmount: string;
  rate: string;
  status: string;
  createdAt: string;
  fundingRequest: {
    title: string;
    category: string;
    organization: { legalName: string };
  };
}

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} K`;
  return v.toLocaleString("fr-FR");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function BarChart({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex h-32 items-end gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md bg-blue-200 transition-all"
            style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total > 0 ? "4px" : "0" }}
          />
          <p className="text-xs text-gray-400">{d.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminFinancesPage() {
  const { token } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .get<Commission[]>("/repayments/admin/commissions", token)
      .then(setCommissions)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const totalCommissions = commissions.reduce((s, c) => s + Number(c.commissionAmount), 0);
  const fundingFees = commissions
    .filter((c) => c.type === "FUNDING_FEE")
    .reduce((s, c) => s + Number(c.commissionAmount), 0);
  const interestFees = commissions
    .filter((c) => c.type === "INTEREST_FEE")
    .reduce((s, c) => s + Number(c.commissionAmount), 0);
  const thisMonthCommissions = commissions
    .filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((s, c) => s + Number(c.commissionAmount), 0);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const total = commissions
      .filter((c) => {
        const cd = new Date(c.createdAt);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      })
      .reduce((s, c) => s + Number(c.commissionAmount), 0);
    return { label: d.toLocaleDateString("fr-FR", { month: "short" }), total };
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Finances</h1>
        <p className="text-sm text-gray-500">
          Revenus de la plateforme et transactions de commission
        </p>
      </div>

      {/* 4 stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Revenus plateforme (mois)", value: `${formatAmount(thisMonthCommissions)} FCFA` },
          { label: "Commissions PME (2%)", value: `${formatAmount(fundingFees)} FCFA` },
          { label: "Commissions intérêts (3%)", value: `${formatAmount(interestFees)} FCFA` },
          { label: "Total commissions", value: `${formatAmount(totalCommissions)} FCFA` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Graphique mensuel */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">
            Revenus et volumes mensuels {currentYear}
          </p>
          <BarChart data={monthlyData} />
        </div>

        {/* Répartition */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">Répartition commissions</p>
          {totalCommissions === 0 ? (
            <p className="text-xs text-gray-400">Aucune commission pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Commission PME (2%)", amount: fundingFees, color: "bg-brand-700" },
                { label: "Commission intérêts (3%)", amount: interestFees, color: "bg-green-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{formatAmount(item.amount)} FCFA</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-1.5 rounded-full ${item.color}`}
                      style={{
                        width: `${totalCommissions > 0 ? (item.amount / totalCommissions) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">
            Transactions de commission (dernières 20)
          </p>
        </div>
        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && commissions.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Aucune commission générée pour le moment.</p>
          </div>
        )}
        {commissions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Flux</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Montant</th>
                  <th className="px-5 py-3 text-center font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.slice(0, 20).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs font-medium text-gray-900">
                        {c.fundingRequest.organization.legalName}
                      </p>
                      <p className="text-xs text-gray-400">{c.fundingRequest.title}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {c.type === "FUNDING_FEE" ? "Commission PME 2%" : "Commission intérêts 3%"}
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-semibold text-green-600">
                      {Number(c.commissionAmount).toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "COLLECTED"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {c.status === "COLLECTED" ? "Perçu" : "En attente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
