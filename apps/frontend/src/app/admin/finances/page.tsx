"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatAdminDate, formatCompactAmount } from "@/lib/admin-ui";

const FILTERS = ["Toutes", "Perçues", "En attente"] as const;
const FILTER_TO_STATUS: Record<string, string | undefined> = {
  Toutes: undefined,
  "Perçues": "COLLECTED",
  "En attente": "PENDING",
};
const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface Commission {
  id: string;
  type: string;
  commissionAmount: string;
  baseAmount: string;
  rate: string;
  status: string;
  createdAt: string;
  fundingRequest: {
    id: string;
    title: string;
    category: string;
    organization: { legalName: string };
  };
}

interface CommissionStats {
  total: number;
  fundingFees: number;
  interestFees: number;
  thisMonth: number;
  thisMonthVolume: number;
  monthly: Array<{ label: string; commissions: number; volume: number }>;
}

interface TopOrganization {
  id: string;
  legalName: string;
  volume: number;
  commissions: number;
  operations: number;
}

// Deux mesures à des échelles très différentes (commissions vs volume traité) :
// deux petits graphiques séparés plutôt qu'un double axe, qui inventerait une
// corrélation artificielle entre les deux échelles.
function MiniBarChart({ data, colorClass }: { data: { label: string; value: number }[]; colorClass: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex gap-2">
      {data.map((d, i) => (
        <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
          {d.value > 0 && (
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {formatCompactAmount(d.value)} FCFA
            </div>
          )}
          {/* Hauteur explicite requise : un pourcentage sur la barre ne se résout
              que si son parent direct a une hauteur définie (pas le flex-col englobant). */}
          <div className="flex h-24 w-full items-end">
            <div
              className={`mx-auto w-full max-w-6 rounded-t-sm ${colorClass} transition-all`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "4px" : "0" }}
            />
          </div>
          <p className="text-[11px] text-gray-400">{d.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminFinancesPage() {
  return (
    <Suspense fallback={null}>
      <AdminFinancesPageContent />
    </Suspense>
  );
}

function AdminFinancesPageContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(
    searchParams.get("status") === "PENDING" ? "En attente" : "Toutes",
  );
  const [page, setPage] = useState(1);

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [topOrganizations, setTopOrganizations] = useState<TopOrganization[]>([]);
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

  const fetchCommissions = useCallback(() => {
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
      .get<{ data: Commission[]; total: number }>(`/repayments/admin/commissions?${params.toString()}`, token)
      .then((res) => {
        // Ignore les réponses obsolètes (une requête plus récente est déjà partie).
        if (requestId !== latestRequestId.current) return;
        setCommissions(res.data);
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
    api.get<CommissionStats>("/repayments/admin/commissions/stats", token).then(setStats);
  }, [token]);

  const fetchTopOrganizations = useCallback(() => {
    if (!token) return;
    api
      .get<TopOrganization[]>("/repayments/admin/commissions/top-organizations", token)
      .then(setTopOrganizations);
  }, [token]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTopOrganizations();
  }, [fetchTopOrganizations]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentYear = new Date().getFullYear();
  const commissionsData = (stats?.monthly ?? []).map((m) => ({ label: m.label, value: m.commissions }));
  const volumeData = (stats?.monthly ?? []).map((m) => ({ label: m.label, value: m.volume }));
  const pmeShare = stats && stats.total > 0 ? (stats.fundingFees / stats.total) * 100 : 0;
  const investorShare = stats && stats.total > 0 ? (stats.interestFees / stats.total) * 100 : 0;

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
          { label: "Revenus plateforme (mois)", value: stats ? `${formatCompactAmount(stats.thisMonth)} FCFA` : "…" },
          { label: "Commissions PME (2%)", value: stats ? `${formatCompactAmount(stats.fundingFees)} FCFA` : "…" },
          { label: "Commissions intérêts (3%)", value: stats ? `${formatCompactAmount(stats.interestFees)} FCFA` : "…" },
          { label: "Volume traité (mois)", value: stats ? `${formatCompactAmount(stats.thisMonthVolume)} FCFA` : "…" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Graphiques mensuels : commissions et volume ont des échelles trop différentes
            pour partager un axe (voir dataviz), donc deux petits graphiques distincts. */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">
            Revenus et volume mensuels {currentYear}
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Commissions perçues</p>
              <MiniBarChart data={commissionsData} colorClass="bg-brand-700" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Volume traité</p>
              <MiniBarChart data={volumeData} colorClass="bg-teal-500" />
            </div>
          </div>
        </div>

        {/* Répartition : 2 catégories en part-du-tout → une barre empilée, pas un donut
            (un donut à 2 tranches se lit moins bien qu'une barre, voir dataviz). */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-gray-900">Répartition commissions</p>
          {!stats || stats.total === 0 ? (
            <p className="text-xs text-gray-400">Aucune commission pour le moment.</p>
          ) : (
            <>
              <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-gray-100">
                {pmeShare > 0 && (
                  <div className="rounded-l-full bg-brand-700" style={{ width: `${pmeShare}%` }} />
                )}
                {investorShare > 0 && (
                  <div className="rounded-r-full bg-green-500" style={{ width: `${investorShare}%` }} />
                )}
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-700" />
                    Commission PME (2%)
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCompactAmount(stats.fundingFees)} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    Commission intérêts (3%)
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCompactAmount(stats.interestFees)} FCFA
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filtres + recherche */}
      <div className="mt-4 mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher par PME ou opportunité..."
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

      {/* Transactions */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Transactions de commission</p>
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
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatAdminDate(c.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/opportunites/${c.fundingRequest.id}`}
                        className="text-xs font-medium text-gray-900 hover:text-brand-700"
                      >
                        {c.fundingRequest.organization.legalName}
                      </Link>
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
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <p>
              {total} commission{total !== 1 ? "s" : ""} au total
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

      {/* Top PME par volume : la commission ne conserve pas l'investisseur/institution
          à l'origine du flux (voir note), donc le classement se fait par PME (l'entité
          reliée de façon fiable à chaque commission), pas par partenaire institutionnel. */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Top PME par volume</p>
        </div>
        {topOrganizations.length === 0 && (
          <p className="p-5 text-sm text-gray-400">Aucune donnée pour le moment.</p>
        )}
        {topOrganizations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">PME</th>
                  <th className="px-5 py-3 text-right font-medium">Volume traité</th>
                  <th className="px-5 py-3 text-right font-medium">Commissions générées</th>
                  <th className="px-5 py-3 text-right font-medium">Opérations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topOrganizations.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs font-medium text-gray-900">{o.legalName}</td>
                    <td className="px-5 py-3 text-right text-xs text-gray-600">
                      {formatCompactAmount(o.volume)} FCFA
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-semibold text-green-600">
                      {formatCompactAmount(o.commissions)} FCFA
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-600">{o.operations}</td>
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
