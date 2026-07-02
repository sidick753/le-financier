"use client";

import { useState } from "react";
import { useAdminData } from "@/lib/use-admin-data";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  INVESTOR: { label: "Particulier", className: "bg-blue-50 text-blue-700" },
  INSTITUTION: { label: "Institution", className: "bg-purple-50 text-purple-700" },
};

const KYC_CONFIG: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "Vérifié", className: "bg-green-100 text-green-700" },
  PENDING: { label: "En attente KYC", className: "bg-yellow-100 text-yellow-700" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} K`;
  return v.toLocaleString("fr-FR");
}

export default function AdminInvestisseursPage() {
  const { users, isLoading, refresh } = useAdminData();
  const { token } = useAuth();
  const [filter, setFilter] = useState("Tous");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const investors = users.filter((u) => ["INVESTOR", "INSTITUTION"].includes(u.role));
  const particuliers = investors.filter((u) => u.role === "INVESTOR");
  const institutions = investors.filter((u) => u.role === "INSTITUTION");
  const totalEngaged = investors.reduce(
    (sum, u) =>
      sum +
      u.investments
        .filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status))
        .reduce((s, i) => s + Number(i.amountCommitted), 0),
    0,
  );

  const FILTERS = ["Tous", "Particuliers", "Institutions/Banques"];
  const filtered = investors.filter((u) => {
    if (filter === "Particuliers") return u.role === "INVESTOR";
    if (filter === "Institutions/Banques") return u.role === "INSTITUTION";
    return true;
  });

  async function handleAction(id: string, action: "verify-kyc" | "reject-kyc") {
    setActionLoading(id);
    try {
      await api.patch(`/auth/admin/users/${id}/${action}`, {}, token!);
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Investisseurs</h1>
        <p className="text-sm text-gray-500">Tous les investisseurs inscrits sur la plateforme</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Total investisseurs", value: investors.length },
          { label: "Institutions", value: institutions.length },
          { label: "Particuliers", value: particuliers.length },
          { label: "Engagements totaux", value: `${formatAmount(totalEngaged)} FCFA` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === f ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="p-5 text-sm text-gray-400">Aucun investisseur trouvé.</p>
        )}
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Investisseur</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Statut</th>
                  <th className="px-5 py-3 text-left font-medium">Actifs</th>
                  <th className="px-5 py-3 text-right font-medium">Engagé</th>
                  <th className="px-5 py-3 text-left font-medium">Inscription</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => {
                  const roleConfig = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.INVESTOR;
                  const kycConfig = KYC_CONFIG[u.kycStatus] ?? KYC_CONFIG.PENDING;
                  const activeInv = u.investments.filter((i) =>
                    ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status),
                  );
                  const totalEngaged = activeInv.reduce(
                    (s, i) => s + Number(i.amountCommitted),
                    0,
                  );
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleConfig.className}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kycConfig.className}`}>
                          {kycConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {activeInv.length} inv.
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                        {totalEngaged > 0 ? `${formatAmount(totalEngaged)} FCFA` : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          {u.kycStatus === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleAction(u.id, "verify-kyc")}
                                disabled={actionLoading === u.id}
                                className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                Valider
                              </button>
                              <button
                                onClick={() => handleAction(u.id, "reject-kyc")}
                                disabled={actionLoading === u.id}
                                className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          {u.kycStatus === "VERIFIED" && (
                            <span className="text-xs text-gray-400">Voir</span>
                          )}
                        </div>
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
  );
}
