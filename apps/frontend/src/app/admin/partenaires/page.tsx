"use client";

import { useAdminData } from "@/lib/use-admin-data";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState } from "react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} M`;
  return `${(v / 1_000).toFixed(0)} K`;
}

export default function AdminPartenairesPage() {
  const { users, isLoading, refresh } = useAdminData();
  const { token } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const institutions = users.filter((u) => u.role === "INSTITUTION");
  const verified = institutions.filter((u) => u.kycStatus === "VERIFIED");
  const pending = institutions.filter((u) => u.kycStatus === "PENDING");
  const totalEngaged = institutions.reduce(
    (sum, u) =>
      sum + u.investments
        .filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status))
        .reduce((s, i) => s + Number(i.amountCommitted), 0),
    0,
  );

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Partenaires</h1>
          <p className="text-sm text-gray-500">Gestion des partenaires institutionnels</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Partenaires vérifiés", value: verified.length },
          { label: "En attente", value: pending.length },
          { label: "Total partenaires", value: institutions.length },
          { label: "Volume engagé", value: `${formatAmount(totalEngaged)} FCFA` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && institutions.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Aucun partenaire institutionnel pour le moment.</p>
          </div>
        )}
        {institutions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Institution</th>
                  <th className="px-5 py-3 text-left font-medium">Email</th>
                  <th className="px-5 py-3 text-left font-medium">Statut KYC</th>
                  <th className="px-5 py-3 text-right font-medium">Volume engagé</th>
                  <th className="px-5 py-3 text-left font-medium">Inscrit le</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {institutions.map((u) => {
                  const totalEng = u.investments
                    .filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status))
                    .reduce((s, i) => s + Number(i.amountCommitted), 0);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.kycStatus === "VERIFIED"
                            ? "bg-green-100 text-green-700"
                            : u.kycStatus === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {u.kycStatus === "VERIFIED" ? "Vérifié" :
                           u.kycStatus === "PENDING" ? "En attente" : "Rejeté"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                        {totalEng > 0 ? `${formatAmount(totalEng)} FCFA` : "—"}
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
                                className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 disabled:opacity-50"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          {u.kycStatus !== "PENDING" && (
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
