"use client";

import Link from "next/link";
import { useWatchlist, WatchlistEntry } from "@/lib/use-watchlist";
import { GRADE_CLASSNAMES } from "@/lib/use-institution-data";
import { FUNDING_STATUS_CONFIG } from "@/lib/admin-ui";
import { NotifBell } from "@/components/ui/notif-bell";

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, string> = {
  FACTURE: "bg-blue-100 text-blue-700",
  PRET:    "bg-green-100 text-green-700",
  EQUITY:  "bg-purple-100 text-purple-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Facture",
  PRET:    "Prêt",
  EQUITY:  "Equity",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtFull(v: string | number, currency = "F CFA") {
  return `${Number(v).toLocaleString("fr-FR")} ${currency}`;
}

function fmtDuration(months: number | null, category: string) {
  if (!months) return category === "EQUITY" ? "Long terme" : "—";
  if (category === "FACTURE") return `${months * 30} jours`;
  return `${months} mois`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ── card ──────────────────────────────────────────────────────────────────────

function FavoriteCard({ entry, onRemove }: { entry: WatchlistEntry; onRemove: (fundingRequestId: string) => void }) {
  const opp = entry.fundingRequest;
  const badge = CATEGORY_BADGE[opp.category] ?? "bg-slate-100 text-slate-600";
  const label = CATEGORY_LABELS[opp.category] ?? opp.category;
  const closeDate = fmtDate(opp.closesAt);
  const report = opp.scoringReports?.[0] ?? null;
  const score = report ? Math.round(Number(report.autoScore)) : null;
  const statusConfig = opp.status !== "PUBLISHED" ? FUNDING_STATUS_CONFIG[opp.status] : null;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)]">

      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold text-slate-900">{opp.organization.legalName}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig ? statusConfig.className : badge}`}>
            {statusConfig ? statusConfig.label : label}
          </span>
          <button
            type="button"
            onClick={() => onRemove(opp.id)}
            title="Retirer des favoris"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-500 transition hover:bg-amber-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mb-4 text-[13px] font-medium text-green-600">{opp.title}</p>

      {/* Metrics */}
      <div className="mb-4 space-y-2 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Montant</span>
          <span className="text-[13px] font-bold text-slate-900">{fmtFull(opp.amountRequested, opp.currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Durée</span>
          <span className="text-[13px] font-bold text-slate-900">
            {fmtDuration(opp.durationMonths, opp.category)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Rendement</span>
          <span className="text-[13px] font-bold text-green-600">
            {opp.expectedReturn ? `${Number(opp.expectedReturn)}%` : "—"}
          </span>
        </div>
      </div>

      {/* Score de risque */}
      <div className="mb-4 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Score de risque</span>
          {report && score !== null ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-slate-900">{score}/100</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${GRADE_CLASSNAMES[report.grade ?? ""] ?? "bg-slate-100 text-slate-500"}`}>
                {report.grade}
              </span>
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-slate-400">Non évalué</span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${score !== null && score >= 70 ? "bg-green-500" : score !== null && score >= 55 ? "bg-yellow-400" : score !== null && score >= 40 ? "bg-orange-400" : score !== null ? "bg-red-400" : "bg-slate-300"}`}
            style={{ width: `${score ?? 0}%` }}
          />
        </div>
      </div>

      {/* Description + date */}
      <div className="mb-4 flex-1">
        <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500">{opp.description}</p>
        {closeDate && (
          <p className="mt-2 text-[11px] text-slate-400">Date limite : {closeDate}</p>
        )}
      </div>

      {/* CTA */}
      <Link
        href={`/investor/opportunites/${opp.id}`}
        className="flex items-center justify-center gap-2 rounded-[10px] bg-blue-700 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-800"
      >
        Voir le détail
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function FavorisPage() {
  const { entries, isLoading, removeFavorite } = useWatchlist();

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Mes favoris</p>
          <p className="text-xs text-slate-500">
            {isLoading
              ? "Chargement..."
              : `${entries.length} opportunité${entries.length !== 1 ? "s" : ""} en favoris`}
          </p>
        </div>
        <NotifBell href="/investor/notifications" />
      </header>

      <div className="p-8 pb-16">
        <div className="grid grid-cols-3 gap-5">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            ))}

          {!isLoading && entries.length === 0 && (
            <div className="col-span-3 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-3">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <p className="text-[14px] font-semibold text-slate-900">Aucun favori pour le moment</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Parcourez les opportunités et cliquez sur « Ajouter à mes favoris » pour les retrouver ici.
              </p>
              <Link
                href="/investor/explorer"
                className="mt-4 rounded-[10px] bg-blue-700 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-800"
              >
                Explorer les opportunités
              </Link>
            </div>
          )}

          {!isLoading && entries.map((entry) => (
            <FavoriteCard key={entry.id} entry={entry} onRemove={removeFavorite} />
          ))}
        </div>
      </div>
    </>
  );
}
