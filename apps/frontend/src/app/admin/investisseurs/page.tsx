"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import type { AdminUser } from "@/lib/use-admin-data";
import { KYC_STATUS_CONFIG, formatAdminDate, formatCompactAmount } from "@/lib/admin-ui";
import { useSortableRows } from "@/lib/use-sortable-rows";
import { SortableTh } from "@/components/ui/sortable-th";
import { NotifBell } from "@/components/ui/notif-bell";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface AdminStats {
  total: number;
  pendingKyc: number;
  totalEngaged: number;
}

export default function AdminInvestisseursPage() {
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminStats | null>(null);
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

  const fetchUsers = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    const requestId = ++latestRequestId.current;
    const params = new URLSearchParams();
    // Les institutions/banques ont leur propre dossier dans /admin/partenaires —
    // cette page ne couvre que les investisseurs particuliers.
    params.set("role", "INVESTOR");
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    api
      .get<{ data: AdminUser[]; total: number }>(`/auth/admin/users?${params.toString()}`, token)
      .then((res) => {
        // Ignore les réponses obsolètes (une requête plus récente est déjà partie).
        if (requestId !== latestRequestId.current) return;
        setUsers(res.data);
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
  }, [token, search, page]);

  const fetchStats = useCallback(() => {
    if (!token) return;
    api.get<AdminStats>("/auth/admin/users/investor-stats", token).then(setStats);
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleAction(id: string, action: "verify-kyc" | "reject-kyc") {
    setActionLoading(id);
    try {
      await api.patch(`/auth/admin/users/${id}/${action}`, {}, token!);
      fetchUsers();
      refreshBadges();
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { sortedRows: sortedUsers, sortKey, direction, toggleSort } = useSortableRows(users, {
    name: (u) => `${u.firstName} ${u.lastName}`,
    status: (u) => u.kycStatus,
    active: (u) =>
      u.investments.filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status)).length,
    engaged: (u) =>
      u.investments
        .filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status))
        .reduce((s, i) => s + Number(i.amountCommitted), 0),
    createdAt: (u) => u.createdAt,
  });

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[15px] font-black tracking-tight text-gray-900">Investisseurs</p>
          <p className="text-xs text-gray-500">
            Investisseurs particuliers inscrits sur la plateforme — les institutions/banques sont gérées dans Partenaires
          </p>
        </div>
        <NotifBell href="/admin/notifications" />
      </header>

      <div className="p-8">
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Total investisseurs" value={stats ? stats.total : "…"} />
        <StatCard label="KYC en attente" value={stats ? stats.pendingKyc : "…"} />
        <StatCard
          label="Engagements totaux"
          value={stats ? `${formatCompactAmount(stats.totalEngaged)} FCFA` : "…"}
        />
      </div>

      {/* Recherche */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher un investisseur..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
        />
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && users.length === 0 && (
          <p className="p-5 text-sm text-gray-400">Aucun investisseur trouvé.</p>
        )}
        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <SortableTh label="Investisseur" sortKey="name" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Statut" sortKey="status" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Actifs" sortKey="active" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Engagé" sortKey="engaged" currentKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                  <SortableTh label="Inscription" sortKey="createdAt" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedUsers.map((u) => {
                  const kycConfig = KYC_STATUS_CONFIG[u.kycStatus] ?? KYC_STATUS_CONFIG.PENDING;
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
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kycConfig.className}`}>
                          {kycConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {activeInv.length} inv.
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                        {totalEngaged > 0 ? `${formatCompactAmount(totalEngaged)} FCFA` : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatAdminDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/investisseurs/${u.id}`}
                            className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Voir le dossier →
                          </Link>
                          {/* {u.kycStatus === "PENDING" && (
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
                          )} */}
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
              {total} investisseur{total !== 1 ? "s" : ""} au total
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
