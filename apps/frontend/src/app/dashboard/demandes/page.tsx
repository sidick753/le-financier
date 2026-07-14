"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePmeData, FundingRequest } from "@/lib/use-pme-data";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { NotifBell } from "@/components/ui/notif-bell";
import { EDITABLE_STATUSES } from "@/lib/funding-status";

// ── status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; pillBorder: string }> = {
  DRAFT:        { label: "Brouillon",   badgeClass: "bg-slate-100 text-slate-600",   pillBorder: "border-l-slate-400" },
  UNDER_REVIEW: { label: "En révision", badgeClass: "bg-amber-50 text-amber-600",    pillBorder: "border-l-amber-500" },
  PUBLISHED:    { label: "Publié",      badgeClass: "bg-blue-50 text-blue-600",      pillBorder: "border-l-blue-600" },
  FUNDED:       { label: "Financé",     badgeClass: "bg-green-50 text-green-600",    pillBorder: "border-l-green-600" },
  CLOSED:       { label: "Clôturé",     badgeClass: "bg-slate-100 text-slate-500",   pillBorder: "border-l-slate-900" },
  REJECTED:     { label: "Rejeté",      badgeClass: "bg-red-50 text-red-600",        pillBorder: "border-l-red-500" },
  CANCELLED:    { label: "Annulé",      badgeClass: "bg-slate-100 text-slate-500",   pillBorder: "border-l-slate-400" },
};

const STATUS_FILTERS = [
  { key: "PUBLISHED",    label: "Publiées" },
  { key: "UNDER_REVIEW", label: "En cours" },
  { key: "FUNDED",       label: "Financées" },
  { key: "DRAFT",        label: "Brouillon" },
  { key: "CLOSED",       label: "Clôturées" },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(v: string | number) {
  const n = Number(v);
  if (!n) return "—";
  return n.toLocaleString("fr-FR") + " F CFA";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ── card ──────────────────────────────────────────────────────────────────────

function DemandeCard({ request: r, onDeleted }: { request: FundingRequest; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { token } = useAuth();
  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.DRAFT;
  const editable = EDITABLE_STATUSES.includes(r.status);

  async function handleDelete() {
    if (!token) return;
    if (!window.confirm("Supprimer définitivement cette demande ?")) return;
    setDeleting(true);
    try {
      await api.delete(`/funding-requests/${r.id}`, token);
      onDeleted(r.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      setDeleting(false);
    }
  }

  return (
    <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.07)]">

      {/* Top row */}
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-[15px] font-medium text-slate-900">{r.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.badgeClass}`}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* 3-dot dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                <Link
                  href={`/dashboard/demandes/${r.id}`}
                  className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-slate-900 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                  </svg>
                  Voir les détails
                </Link>
                {editable && (
                  <Link
                    href={`/dashboard/demandes/${r.id}/edit`}
                    className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-slate-900 hover:bg-slate-50"
                    onClick={() => setOpen(false)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
                    </svg>
                    Modifier
                  </Link>
                )}
                <div className="my-1 h-px bg-slate-100" />
                <button
                  onClick={handleDelete}
                  disabled={!editable || deleting}
                  title={!editable ? "Impossible de supprimer une demande déjà publiée." : undefined}
                  className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                  {deleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex gap-0 border-t border-slate-100 pt-3.5">
        <div className="min-w-0 flex-1 pr-3">
          <p className="mb-1 text-[11px] text-slate-500">Montant</p>
          <p className="text-[13px] font-medium text-slate-900">{fmtAmount(r.amountRequested)}</p>
        </div>
        <div className="min-w-0 flex-1 pr-3">
          <p className="mb-1 text-[11px] text-slate-500">Offres reçues</p>
          <p className="text-[13px] font-medium text-slate-900">{r._count.investments}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] text-slate-500">Devise</p>
          <p className="text-[13px] font-medium text-slate-900">{r.currency}</p>
        </div>
      </div>

      <p className="mt-2.5 text-[11px] text-slate-400">Créée le {fmtDate(r.createdAt)}</p>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DemandesPage() {
  const { fundingRequests, isLoading, error, refresh } = usePmeData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of fundingRequests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [fundingRequests]);

  const filtered = useMemo(() => {
    return fundingRequests.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        return r.title.toLowerCase().includes(term) ||
          r.amountRequested.includes(term) ||
          r.currency.toLowerCase().includes(term);
      }
      return true;
    });
  }, [fundingRequests, search, statusFilter]);

  return (
    <>
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-[18px] font-semibold tracking-tight text-slate-900">
              Mes demandes de financement
            </p>
            <p className="text-xs text-slate-500">
              {fundingRequests.length} demande{fundingRequests.length !== 1 ? "s" : ""} au total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/demandes/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-blue-600 px-3.5 text-[13px] font-medium text-white shadow-[0_6px_16px_rgba(37,99,235,0.22)] transition hover:-translate-y-px hover:bg-blue-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouvelle demande
          </Link>
          <NotifBell />
        </div>
      </header>

      <div className="p-8 pb-16">
        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
        )}

        {/* ── Search ── */}
        <div className="mb-5 flex gap-2.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, montant..."
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white pl-9 pr-9 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition hover:bg-slate-300"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Status pills ── */}
        <div className="mb-5 flex gap-2.5">
          {STATUS_FILTERS.map((sf) => {
            const count = counts[sf.key] ?? 0;
            const cfg = STATUS_CONFIG[sf.key];
            const active = statusFilter === sf.key;
            return (
              <button
                key={sf.key}
                onClick={() => setStatusFilter(active ? null : sf.key)}
                className={`flex-1 rounded-[14px] border border-l-[3px] bg-white p-4 text-left transition hover:-translate-y-px hover:shadow-md ${cfg.pillBorder} ${active ? "shadow-md" : ""}`}
              >
                <p className="text-[22px] font-bold leading-none tracking-tight text-slate-900">{count}</p>
                <p className="mt-1.5 text-[11px] font-medium text-slate-500">{sf.label}</p>
              </button>
            );
          })}
        </div>

        {/* ── Cards ── */}
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-[13px] text-slate-400">
            Chargement...
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-20">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-[15px] font-medium text-slate-900">
              {search || statusFilter ? "Aucun résultat" : "Aucune demande trouvée"}
            </p>
            <p className="mt-1.5 text-[13px] text-slate-500">
              {search || statusFilter
                ? "Aucune demande ne correspond à vos critères."
                : "Vous n'avez pas encore soumis de demande de financement."}
            </p>
            {!search && !statusFilter && (
              <Link
                href="/dashboard/demandes/new"
                className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-blue-600 px-4 text-[13px] font-medium text-white shadow-[0_6px_16px_rgba(37,99,235,0.22)] transition hover:-translate-y-px hover:bg-blue-700"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Créer une demande
              </Link>
            )}
          </div>
        )}

        {!isLoading && filtered.map((r) => <DemandeCard key={r.id} request={r} onDeleted={refresh} />)}
      </div>
    </>
  );
}
