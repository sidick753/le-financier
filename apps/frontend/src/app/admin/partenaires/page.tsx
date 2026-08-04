"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { KYC_STATUS_CONFIG, formatAdminDate, formatCompactAmount } from "@/lib/admin-ui";
import { useSortableRows } from "@/lib/use-sortable-rows";
import { SortableTh } from "@/components/ui/sortable-th";
import { NotifBell } from "@/components/ui/notif-bell";

const FILTERS = ["Tous", "Vérifié", "En attente", "Suspendu"] as const;
const FILTER_TO_STATUS: Record<string, string | undefined> = {
  Tous: undefined,
  Vérifié: "VERIFIED",
  "En attente": "PENDING",
  Suspendu: "REJECTED",
};
const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface AdminInstitution {
  id: string;
  name: string;
  type: string | null;
  bceaoApprovalNumber: string | null;
  envelopeMax: string | null;
  createdAt: string;
  memberCount: number;
  owner: { firstName: string; lastName: string; email: string; kycStatus: string } | null;
  totalEngaged: number;
}

interface AdminStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  totalEngaged: number;
}

export default function AdminPartenairesPage() {
  return (
    <Suspense fallback={null}>
      <AdminPartenairesPageContent />
    </Suspense>
  );
}

function AdminPartenairesPageContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(
    searchParams.get("status") === "PENDING" ? "En attente" : "Tous",
  );
  const [page, setPage] = useState(1);

  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
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

  const fetchInstitutions = useCallback(() => {
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
      .get<{ data: AdminInstitution[]; total: number }>(
        `/institutions/admin/all?${params.toString()}`,
        token,
      )
      .then((res) => {
        // Ignore les réponses obsolètes (une requête plus récente est déjà partie).
        if (requestId !== latestRequestId.current) return;
        setInstitutions(res.data);
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
    api.get<AdminStats>("/institutions/admin/stats", token).then(setStats);
  }, [token]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { sortedRows: sortedInstitutions, sortKey, direction, toggleSort } = useSortableRows(
    institutions,
    {
      name: (i) => i.name,
      approval: (i) => i.bceaoApprovalNumber,
      status: (i) => i.owner?.kycStatus ?? "",
      members: (i) => i.memberCount,
      engaged: (i) => i.totalEngaged,
      createdAt: (i) => i.createdAt,
    },
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[15px] font-black tracking-tight text-gray-900">Partenaires</p>
          <p className="text-xs text-gray-500">
            Gestion des partenaires institutionnels (banques, sociétés de microfinance...)
          </p>
        </div>
        <NotifBell href="/admin/notifications" />
      </header>

      <div className="p-8">
      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard label="Total partenaires" value={stats ? stats.total : "…"} />
        <StatCard label="Vérifiés" value={stats ? stats.verified : "…"} green />
        <StatCard label="En attente" value={stats ? stats.pending : "…"} orange />
        <StatCard
          label="Volume engagé"
          value={stats ? `${formatCompactAmount(stats.totalEngaged)} FCFA` : "…"}
        />
      </div>

      {/* Filtres + recherche */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher un partenaire..."
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
        {!isLoading && institutions.length === 0 && (
          <p className="p-5 text-sm text-gray-400">Aucun partenaire trouvé.</p>
        )}
        {institutions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <SortableTh label="Institution" sortKey="name" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Agrément BCEAO" sortKey="approval" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Statut" sortKey="status" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Membres" sortKey="members" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Volume engagé" sortKey="engaged" currentKey={sortKey} direction={direction} onSort={toggleSort} align="right" />
                  <SortableTh label="Inscrit le" sortKey="createdAt" currentKey={sortKey} direction={direction} onSort={toggleSort} />
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedInstitutions.map((inst) => {
                  const kycConfig = inst.owner
                    ? KYC_STATUS_CONFIG[inst.owner.kycStatus] ?? KYC_STATUS_CONFIG.PENDING
                    : null;
                  return (
                    <tr key={inst.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{inst.name}</p>
                        <p className="text-xs text-gray-400">{inst.type ?? "—"}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {inst.bceaoApprovalNumber ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {kycConfig ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kycConfig.className}`}>
                            {kycConfig.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {inst.memberCount} membre{inst.memberCount !== 1 ? "s" : ""}
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-gray-900">
                        {inst.totalEngaged > 0
                          ? `${formatCompactAmount(inst.totalEngaged)} FCFA`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatAdminDate(inst.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/partenaires/${inst.id}`}
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
              {total} partenaire{total !== 1 ? "s" : ""} au total
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
