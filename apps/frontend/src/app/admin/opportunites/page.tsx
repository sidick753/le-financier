"use client";

import { useState } from "react";
import { useAdminData } from "@/lib/use-admin-data";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-600" },
  UNDER_REVIEW: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  PUBLISHED: { label: "Publiée", className: "bg-blue-100 text-blue-700" },
  FUNDED: { label: "En financement", className: "bg-purple-100 text-purple-700" },
  CLOSED: { label: "Clôturée", className: "bg-gray-100 text-gray-600" },
  REJECTED: { label: "Rejetée", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Suspendue", className: "bg-orange-100 text-orange-700" },
};

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt MLT",
  EQUITY: "Equity",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatAmount(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} M`;
  return `${(v / 1_000).toFixed(0)} K`;
}

export default function AdminOpportunitesPage() {
  const { fundingRequests, isLoading, refresh } = useAdminData();
  const { token } = useAuth();
  const [filter, setFilter] = useState("Tous");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const FILTERS = ["Tous", "Publiée", "En financement", "Clôturée", "Suspendue"];

  const published = fundingRequests.filter((f) => f.status === "PUBLISHED").length;
  const funded = fundingRequests.filter((f) => f.status === "FUNDED").length;
  const closed = fundingRequests.filter((f) =>
    ["CLOSED", "CANCELLED"].includes(f.status),
  ).length;
  const totalRaised = fundingRequests.reduce((s, f) => s + Number(f.amountRaised ?? 0), 0);

  const filtered = fundingRequests.filter((f) => {
    if (filter === "Publiée") return f.status === "PUBLISHED";
    if (filter === "En financement") return f.status === "FUNDED";
    if (filter === "Clôturée") return f.status === "CLOSED";
    if (filter === "Suspendue") return f.status === "CANCELLED";
    return true;
  });

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await api.patch(`/funding-requests/${id}/approve`, {}, token!);
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(id: string) {
    setActionLoading(id);
    try {
      await api.patch(`/funding-requests/${id}/cancel`, {}, token!);
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Opportunités</h1>
        <p className="text-sm text-gray-500">Toutes les opportunités publiées sur la plateforme</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Opportunités publiées", value: published },
          { label: "En cours de financement", value: funded },
          { label: "Clôturées ce mois", value: closed },
          { label: "Levés ce mois", value: `${formatAmount(totalRaised)} FCFA` },
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
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">PME</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Montant</th>
                  <th className="px-5 py-3 text-left font-medium">Progression</th>
                  <th className="px-5 py-3 text-left font-medium">Statut</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((fr) => {
                  const config = STATUS_CONFIG[fr.status] ?? STATUS_CONFIG.DRAFT;
                  const requested = Number(fr.amountRequested);
                  const raised = Number(fr.amountRaised ?? 0);
                  const progress = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;
                  return (
                    <tr key={fr.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">
                          {fr.organization?.legalName ?? "—"}
                        </p>
                        <p className="text-xs text-gray-400">{fr.title}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {CATEGORY_LABELS[fr.category] ?? fr.category}
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                        {formatAmount(requested)} FCFA
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full bg-brand-700"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{progress.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatDate(fr.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          {fr.status === "UNDER_REVIEW" && (
                            <button
                              onClick={() => handleApprove(fr.id)}
                              disabled={actionLoading === fr.id}
                              className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Approuver
                            </button>
                          )}
                          {["PUBLISHED", "FUNDED"].includes(fr.status) && (
                            <button
                              onClick={() => handleCancel(fr.id)}
                              disabled={actionLoading === fr.id}
                              className="rounded-md border border-orange-200 px-3 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                            >
                              Suspendre
                            </button>
                          )}
                          <span className="text-xs text-gray-400 cursor-pointer hover:text-brand-700">
                            Voir
                          </span>
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
