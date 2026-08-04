"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { FUNDING_STATUS_CONFIG, formatAdminDate, formatCompactAmount } from "@/lib/admin-ui";
import { useSortableRows } from "@/lib/use-sortable-rows";
import { SortableTh } from "@/components/ui/sortable-th";
import { NotifBell } from "@/components/ui/notif-bell";

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt MLT",
  EQUITY: "Equity",
};

const FILTERS = [
  "Tous",
  "En attente",
  "Publiée",
  "En financement",
  "Clôturée",
  "Suspendue",
] as const;
const FILTER_TO_STATUS: Record<string, string | undefined> = {
  Tous: undefined,
  "En attente": "UNDER_REVIEW",
  Publiée: "PUBLISHED",
  "En financement": "FUNDED",
  Clôturée: "CLOSED",
  Suspendue: "CANCELLED",
};
const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface AdminFundingRequest {
  id: string;
  title: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  status: string;
  createdAt: string;
  organization?: { legalName: string };
  pendingSettlementsCount: number;
  pendingClaimsCount: number;
}

interface FundingAdminStats {
  total: number;
  published: number;
  funded: number;
  closed: number;
  totalRaised: number;
}

export default function AdminOpportunitesPage() {
  return (
    <Suspense fallback={null}>
      <AdminOpportunitesPageContent />
    </Suspense>
  );
}

function AdminOpportunitesPageContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(
    searchParams.get("status") === "UNDER_REVIEW" ? "En attente" : "Tous",
  );
  const [page, setPage] = useState(1);

  const [fundingRequests, setFundingRequests] = useState<AdminFundingRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<FundingAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const latestRequestId = useRef(0);

  // Debounce la recherche pour éviter une requête à chaque frappe.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchFundingRequests = useCallback(() => {
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
      .get<{ data: AdminFundingRequest[]; total: number }>(
        `/funding-requests/admin/all?${params.toString()}`,
        token,
      )
      .then((res) => {
        // Ignore les réponses obsolètes (une requête plus récente est déjà partie).
        if (requestId !== latestRequestId.current) return;
        setFundingRequests(res.data);
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
    api.get<FundingAdminStats>("/funding-requests/admin/stats", token).then(setStats);
  }, [token]);

  useEffect(() => {
    fetchFundingRequests();
  }, [fetchFundingRequests]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleCancel(id: string) {
    setActionLoading(id);
    try {
      await api.patch(`/funding-requests/${id}/cancel`, {}, token!);
      fetchFundingRequests();
      fetchStats();
      refreshBadges();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReactivate(id: string) {
    setActionLoading(id);
    try {
      await api.patch(`/funding-requests/${id}/reactivate`, {}, token!);
      fetchFundingRequests();
      fetchStats();
      refreshBadges();
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { sortedRows: sortedFundingRequests, sortKey, direction, toggleSort } = useSortableRows(
    fundingRequests,
    {
      pme: (fr) => fr.organization?.legalName ?? "",
      category: (fr) => fr.category,
      amount: (fr) => Number(fr.amountRequested),
      progress: (fr) => {
        const requested = Number(fr.amountRequested);
        const raised = Number(fr.amountRaised ?? 0);
        return requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;
      },
      status: (fr) => fr.status,
      createdAt: (fr) => fr.createdAt,
    },
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[15px] font-black tracking-tight text-gray-900">Opportunités</p>
          <p className="text-xs text-gray-500">Toutes les opportunités publiées sur la plateforme</p>
        </div>
        <NotifBell href="/admin/notifications" />
      </header>

      <div className="p-8">
      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Opportunités publiées", value: stats ? stats.published : "…" },
          { label: "En cours de financement", value: stats ? stats.funded : "…" },
          { label: "Clôturées ce mois", value: stats ? stats.closed : "…" },
          {
            label: "Levés ce mois",
            value: stats ? `${formatCompactAmount(stats.totalRaised)} FCFA` : "…",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres + recherche */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher une opportunité..."
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
                filter === f ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && fundingRequests.length === 0 && (
          <p className="p-5 text-sm text-gray-400">Aucune opportunité trouvée.</p>
        )}
        {fundingRequests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <SortableTh label="PME" sortKey="pme" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Type" sortKey="category" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Montant" sortKey="amount" currentKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                  <SortableTh label="Progression" sortKey="progress" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Statut" sortKey="status" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Date" sortKey="createdAt" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedFundingRequests.map((fr) => {
                  const config = FUNDING_STATUS_CONFIG[fr.status] ?? FUNDING_STATUS_CONFIG.DRAFT;
                  const requested = Number(fr.amountRequested);
                  const raised = Number(fr.amountRaised ?? 0);
                  const progress = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;
                  const needsAction =
                    fr.status === "UNDER_REVIEW" ||
                    fr.pendingSettlementsCount > 0 ||
                    fr.pendingClaimsCount > 0;
                  return (
                    <tr
                      key={fr.id}
                      className={
                        needsAction
                          ? "border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-50"
                          : "border-l-4 border-l-transparent hover:bg-gray-50"
                      }
                    >
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
                        {formatCompactAmount(requested)} FCFA
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              fr.status === "UNDER_REVIEW"
                                ? "font-bold ring-1 ring-yellow-300 " + config.className
                                : config.className
                            }`}
                          >
                            {fr.status === "UNDER_REVIEW" && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 7v5l3 3" />
                              </svg>
                            )}
                            {config.label}
                          </span>
                          {fr.pendingSettlementsCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M12 9v4M12 17h.01" />
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" />
                              </svg>
                              Preuve à valider{fr.pendingSettlementsCount > 1 ? ` (${fr.pendingSettlementsCount})` : ""}
                            </span>
                          )}
                          {fr.pendingClaimsCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M12 9v4M12 17h.01" />
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" />
                              </svg>
                              Réclamation à valider{fr.pendingClaimsCount > 1 ? ` (${fr.pendingClaimsCount})` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatAdminDate(fr.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/opportunites/${fr.id}`}
                            className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Voir le dossier →
                          </Link>
                          {/* {["PUBLISHED", "FUNDED"].includes(fr.status) && (
                            <button
                              onClick={() => handleCancel(fr.id)}
                              disabled={actionLoading === fr.id}
                              className="rounded-md border border-orange-200 px-3 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                            >
                              Suspendre
                            </button>
                          )} */}
                          {fr.status === "CANCELLED" && (
                            <button
                              onClick={() => handleReactivate(fr.id)}
                              disabled={actionLoading === fr.id}
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
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <p>
              {total} opportunité{total !== 1 ? "s" : ""} au total
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
    </>
  );
}
