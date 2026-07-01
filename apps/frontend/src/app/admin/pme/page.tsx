"use client";

import { useState } from "react";
import { useAdminData } from "@/lib/use-admin-data";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "Vérifié", className: "bg-green-100 text-green-700" },
  PENDING: {
    label: "En attente KYC",
    className: "bg-yellow-100 text-yellow-700",
  },
  REJECTED: { label: "Suspendu", className: "bg-red-100 text-red-700" },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("fr-FR");
}

export default function AdminPmePage() {
  const { organizations, isLoading, refresh } = useAdminData();
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const FILTERS = ["Tous", "Vérifié", "En attente", "Suspendu"];

  const filtered = organizations.filter((org) => {
    const matchSearch = org.legalName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchFilter =
      filter === "Tous" ||
      (filter === "Vérifié" && org.verificationStatus === "VERIFIED") ||
      (filter === "En attente" && org.verificationStatus === "PENDING") ||
      (filter === "Suspendu" && org.verificationStatus === "REJECTED");
    return matchSearch && matchFilter;
  });

  const verified = organizations.filter(
    (o) => o.verificationStatus === "VERIFIED",
  ).length;
  const pending = organizations.filter(
    (o) => o.verificationStatus === "PENDING",
  ).length;
  const totalFinanced = organizations.reduce(
    (sum, org) =>
      sum +
      org.fundingRequests.reduce(
        (s, fr) => s + Number(fr.amountRaised ?? 0),
        0,
      ),
    0,
  );

  async function handleAction(id: string, action: "verify" | "reject") {
    setActionLoading(id);
    try {
      await api.patch(
        `/organizations/admin/${id}/${action}`,
        {},
        token!,
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gestion PME</h1>
        <p className="text-sm text-gray-500">
          Toutes les PMEs inscrites sur la plateforme
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard label="PMEs inscrites" value={organizations.length} />
        <StatCard label="Vérifiées" value={verified} green />
        <StatCard label="En attente KYC" value={pending} orange />
        <StatCard
          label="Financés ce mois"
          value={`${formatAmount(totalFinanced)} FCFA`}
        />
      </div>

      {/* Filtres + recherche */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher une PME..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? "bg-brand-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading && (
          <p className="p-5 text-sm text-gray-400">Chargement...</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="p-5 text-sm text-gray-400">Aucune PME trouvée.</p>
        )}
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">PME</th>
                  <th className="px-5 py-3 text-left font-medium">Dirigeant</th>
                  <th className="px-5 py-3 text-left font-medium">Statut</th>
                  <th className="px-5 py-3 text-left font-medium">Demandes</th>
                  <th className="px-5 py-3 text-right font-medium">Financé</th>
                  <th className="px-5 py-3 text-left font-medium">Inscrit le</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((org) => {
                  const config =
                    STATUS_CONFIG[org.verificationStatus] ??
                    STATUS_CONFIG.PENDING;
                  const owner = org.members[0]?.user;
                  const orgFinanced = org.fundingRequests.reduce(
                    (s, fr) => s + Number(fr.amountRaised ?? 0),
                    0,
                  );
                  return (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">
                          {org.legalName}
                        </p>
                        <p className="text-xs text-gray-400">{org.sector}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {owner
                          ? `${owner.firstName} ${owner.lastName}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {org.fundingRequests.length} demande
                        {org.fundingRequests.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                        {orgFinanced > 0
                          ? `${formatAmount(orgFinanced)} FCFA`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatDate(org.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          {org.verificationStatus === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleAction(org.id, "verify")}
                                disabled={actionLoading === org.id}
                                className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                Valider KYC
                              </button>
                              <button
                                onClick={() => handleAction(org.id, "reject")}
                                disabled={actionLoading === org.id}
                                className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          {org.verificationStatus === "VERIFIED" && (
                            <button
                              onClick={() => handleAction(org.id, "reject")}
                              disabled={actionLoading === org.id}
                              className="rounded-md border border-orange-200 px-3 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                            >
                              Suspendre
                            </button>
                          )}
                          {org.verificationStatus === "REJECTED" && (
                            <button
                              onClick={() => handleAction(org.id, "verify")}
                              disabled={actionLoading === org.id}
                              className="rounded-md bg-brand-700 px-3 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                            >
                              Réactiver
                            </button>
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

function StatCard({
  label,
  value,
  green,
  orange,
}: {
  label: string;
  value: number | string;
  green?: boolean;
  orange?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold ${
          green
            ? "text-green-600"
            : orange
              ? "text-orange-600"
              : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
