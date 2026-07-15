"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { AdminOrganization } from "@/lib/use-admin-data";
import { ORG_STATUS_CONFIG, formatAdminDate, formatCompactAmount } from "@/lib/admin-ui";
import { useSortableRows } from "@/lib/use-sortable-rows";
import { SortableTh } from "@/components/ui/sortable-th";

const FILTERS = ["Tous", "Vérifié", "En attente", "Suspendu"] as const;
const FILTER_TO_STATUS: Record<string, string | undefined> = {
  Tous: undefined,
  Vérifié: "VERIFIED",
  "En attente": "PENDING",
  Suspendu: "REJECTED",
};
const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface AdminStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  totalFinanced: number;
}

export default function AdminPmePage() {
  return (
    <Suspense fallback={null}>
      <AdminPmePageContent />
    </Suspense>
  );
}

function AdminPmePageContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(
    searchParams.get("status") === "PENDING" ? "En attente" : "Tous",
  );
  const [page, setPage] = useState(1);

  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const latestRequestId = useRef(0);

  // Debounce la recherche pour éviter une requête à chaque frappe.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchOrganizations = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    const requestId = ++latestRequestId.current;
    const params = new URLSearchParams();
    const status = FILTER_TO_STATUS[filter];
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    api
      .get<{ data: AdminOrganization[]; total: number }>(
        `/organizations/admin/all?${params.toString()}`,
        token,
      )
      .then((res) => {
        // Ignore les réponses obsolètes (une requête plus récente est déjà partie).
        if (requestId !== latestRequestId.current) return;
        setOrganizations(res.data);
        setTotal(res.total);
        setIsLoading(false);
        // Si l'action courante a vidé la page affichée, on saute directement à la bonne page.
        const lastPage = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
        if (res.data.length === 0 && page > lastPage) {
          setPage(lastPage);
        }
      })
      .catch(() => {
        if (requestId === latestRequestId.current) setIsLoading(false);
      });
  }, [token, filter, search, page]);

  const fetchStats = useCallback(() => {
    if (!token) return;
    api.get<AdminStats>("/organizations/admin/stats", token).then(setStats);
  }, [token]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { sortedRows: sortedOrganizations, sortKey, direction, toggleSort } = useSortableRows(
    organizations,
    {
      legalName: (o) => o.legalName,
      owner: (o) => (o.members[0]?.user ? `${o.members[0].user.firstName} ${o.members[0].user.lastName}` : ""),
      status: (o) => o.verificationStatus,
      demandes: (o) => o.fundingRequests.length,
      financed: (o) => o.fundingRequests.reduce((s, fr) => s + Number(fr.amountRaised ?? 0), 0),
      createdAt: (o) => o.createdAt,
    },
  );

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
        <StatCard label="PMEs inscrites" value={stats ? stats.total : "…"} />
        <StatCard
          label="Vérifiées"
          value={stats ? stats.verified : "…"}
          green
        />
        <StatCard
          label="En attente KYC"
          value={stats ? stats.pending : "…"}
          orange
        />
        <StatCard
          label="Financés ce mois"
          value={stats ? `${formatCompactAmount(stats.totalFinanced)} FCFA` : "…"}
        />
      </div>

      {/* Filtres + recherche */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher une PME..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
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
        {!isLoading && organizations.length === 0 && (
          <p className="p-5 text-sm text-gray-400">Aucune PME trouvée.</p>
        )}
        {organizations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <SortableTh label="PME" sortKey="legalName" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Dirigeant" sortKey="owner" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Statut" sortKey="status" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Demandes" sortKey="demandes" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Financé" sortKey="financed" currentKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                  <SortableTh label="Inscrit le" sortKey="createdAt" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedOrganizations.map((org) => {
                  const config =
                    ORG_STATUS_CONFIG[org.verificationStatus] ??
                    ORG_STATUS_CONFIG.PENDING;
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
                          ? `${formatCompactAmount(orgFinanced)} FCFA`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatAdminDate(org.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/pme/${org.id}`}
                          className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Voir le dossier →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <p>
              {total} PME{total !== 1 ? "s" : ""} au total
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Précédent
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
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
