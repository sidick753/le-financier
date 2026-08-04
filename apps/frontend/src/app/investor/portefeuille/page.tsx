"use client";

import { useEffect, useMemo, useState } from "react";
import { useInvestorData, type MyInvestment } from "@/lib/use-investor-data";
import { useNegotiationSocket } from "@/lib/use-negotiation-socket";
import { useNotifications } from "@/lib/use-notifications";
import { NotifBell } from "@/components/ui/notif-bell";
import { ScheduleTimeline } from "@/components/repayment-schedule-timeline";
import { formatCompactAmount } from "@/lib/admin-ui";

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt",
  EQUITY: "Equity",
};

const CATEGORY_COLORS: Record<string, string> = {
  FACTURE: "#3b82f6",
  PRET: "#22c55e",
  EQUITY: "#f97316",
};

const CATEGORY_DOT: Record<string, string> = {
  FACTURE: "bg-blue-500",
  PRET: "bg-green-500",
  EQUITY: "bg-orange-400",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtFull(v: number): string {
  return `${v.toLocaleString("fr-FR")} F CFA`;
}

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("fr-FR", opts ?? {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getEffectiveReturn(inv: MyInvestment): number | null {
  if (inv.lockedReturn) return Number(inv.lockedReturn);
  const last = inv.negotiationOffers?.[0];
  if (last) return Number(last.proposedReturn);
  if (inv.fundingRequest.expectedReturn) return Number(inv.fundingRequest.expectedReturn);
  return null;
}

function getTimeProgress(inv: MyInvestment): number {
  if (inv.status === "SETTLED_OFF_PLATFORM") return 100;
  const dur = inv.fundingRequest.durationMonths;
  if (!dur) return 0;
  const elapsed = Date.now() - new Date(inv.createdAt).getTime();
  const total = dur * 30 * 24 * 60 * 60 * 1000;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

function getDuration(months: number | null): string {
  if (!months) return "";
  if (months >= 24) return `${months / 12} ans`;
  if (months >= 12) return "1 an";
  if (months === 1) return "1 mois";
  return `${months} mois`;
}

function getPerformanceLabel(avgReturn: number): string {
  if (avgReturn >= 10) return "Performance excellente";
  if (avgReturn >= 7) return "Bonne performance";
  if (avgReturn >= 5) return "Performance correcte";
  return "Rendement faible";
}

// ── donut chart ───────────────────────────────────────────────────────────────

function DonutChart({ segments }: {
  segments: Array<{ color: string; pct: number }>;
}) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
      {segments.map((seg, i) => {
        const segLen = (seg.pct / 100) * circ;
        const offset = -cumulative;
        cumulative += segLen;
        return (
          <circle
            key={i}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={`${segLen} ${circ - segLen}`}
            strokeDashoffset={offset}
          />
        );
      })}
    </svg>
  );
}

// ── status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    NEGOTIATING:          { label: "En négociation",  cls: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
    COMMITTED:            { label: "En cours",        cls: "bg-amber-50 text-amber-700 border border-amber-200" },
    SETTLEMENT_SUBMITTED: { label: "Preuve envoyée",  cls: "bg-blue-50 text-blue-700 border border-blue-200" },
    SETTLED_OFF_PLATFORM: { label: "Terminé",         cls: "bg-gray-100 text-gray-500" },
    CANCELLED:            { label: "Annulé",          cls: "bg-red-50 text-red-600" },
    REJECTED:             { label: "Rejeté",          cls: "bg-red-50 text-red-600" },
  };
  const c = cfg[status] ?? cfg.COMMITTED;
  return (
    <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ── investment card ───────────────────────────────────────────────────────────

function InvestmentCard({ inv }: { inv: MyInvestment }) {
  const [expanded, setExpanded] = useState(false);
  const rate        = getEffectiveReturn(inv);
  const progress    = getTimeProgress(inv);
  const dur         = inv.fundingRequest.durationMonths;
  const dueDate     = dur ? addMonths(new Date(inv.createdAt), dur) : null;
  const amount      = Number(inv.amountCommitted);
  const gain        = rate != null ? Math.round((amount * rate) / 100) : null;
  const total       = gain != null ? amount + gain : null;
  const isSettled   = inv.status === "SETTLED_OFF_PLATFORM";
  const isCommitted = inv.status === "COMMITTED";
  const isSubmitted = inv.status === "SETTLEMENT_SUBMITTED";
  const isNeg       = inv.status === "NEGOTIATING";
  const lastOffer   = inv.negotiationOffers?.[0];
  const pmeHasBall  = isNeg && lastOffer?.proposedBy === "PME" && lastOffer?.status === "PENDING";
  const nextPayment = dur && rate && !isSettled && !isCommitted && !isSubmitted
    ? Math.round(amount * (1 + rate / 100) / dur)
    : null;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-5 text-left transition hover:bg-slate-50/60"
      >
      {/* Header row */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-slate-900">
            {inv.fundingRequest.organization.legalName}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600">
              {CATEGORY_LABELS[inv.fundingRequest.category] ?? inv.fundingRequest.category}
            </span>
            {dur && (
              <span className="text-[11px] text-slate-400">{getDuration(dur)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={inv.status} />
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Details grid */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <div>
          <p className="text-[11px] text-slate-400">Investi</p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{fmtFull(amount)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Rendement</p>
          <p className="mt-0.5 text-[13px] font-semibold text-green-600">
            {rate != null ? `${rate}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Investi le</p>
          <p className="mt-0.5 text-[13px] text-slate-700">{fmtDate(inv.createdAt)}</p>
        </div>
        <div>
          {isSettled ? (
            <>
              <p className="text-[11px] text-slate-400">Gain réalisé</p>
              <p className="mt-0.5 text-[13px] font-semibold text-green-600">
                {gain != null ? fmtFull(gain) : "—"}
              </p>
            </>
          ) : dueDate ? (
            <>
              <p className="text-[11px] text-slate-400">Échéance</p>
              <p className="mt-0.5 text-[13px] text-slate-700">{fmtDate(dueDate.toISOString())}</p>
            </>
          ) : (
            <>
              <p className="text-[11px] text-slate-400">Titre</p>
              <p className="mt-0.5 text-[12px] text-slate-500 truncate">{inv.fundingRequest.title}</p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isSettled && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between">
            <p className="text-[11px] text-slate-400">Progression du remboursement</p>
            <p className="text-[11px] font-medium text-slate-600">{progress}%</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-slate-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      </button>

      {/* Bottom action / status section */}
      <div className="px-5 pb-5">
      {isSettled && total != null ? (
        <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2.5">
          <p className="text-[12px] font-medium text-green-700">
            Investissement remboursé avec succès
          </p>
          <p className="text-[12px] font-semibold text-green-700">Reçu : {fmtFull(total)}</p>
        </div>
      ) : isCommitted ? (
        <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${inv.settlementRejectionReason ? "bg-red-50" : "bg-amber-50"}`}>
          <p className={`text-[12px] font-medium ${inv.settlementRejectionReason ? "text-red-700" : "text-amber-700"}`}>
            {inv.settlementRejectionReason
              ? `Preuve de virement rejetée : « ${inv.settlementRejectionReason} ». Nouvelle soumission requise.`
              : "En attente de virement hors plateforme"}
          </p>
          <a
            href={`/investor/opportunites/${inv.fundingRequest.id}`}
            className={`shrink-0 text-[12px] font-medium hover:underline ${inv.settlementRejectionReason ? "text-red-700" : "text-amber-700"}`}
          >
            Voir →
          </a>
        </div>
      ) : isSubmitted ? (
        <div className="rounded-lg bg-blue-50 px-4 py-2.5">
          <p className="text-[12px] font-medium text-blue-700">
            Preuve de virement transmise — en attente de validation par notre équipe.
          </p>
        </div>
      ) : nextPayment ? (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-[12px] text-blue-700">
              Prochain paiement :{" "}
              {dueDate?.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </p>
          </div>
          <p className="text-[12px] font-semibold text-blue-700">{fmtFull(nextPayment)}</p>
        </div>
      ) : pmeHasBall ? (
        <a
          href={`/investor/opportunites/${inv.fundingRequest.id}`}
          className="block rounded-lg bg-yellow-50 px-4 py-2.5 text-[12px] font-medium text-yellow-700 hover:bg-yellow-100"
        >
          Répondre à la contre-proposition de la PME →
        </a>
      ) : isNeg ? (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
          <p className="text-[12px] text-slate-500">En attente de réponse de la PME…</p>
          <a
            href={`/investor/opportunites/${inv.fundingRequest.id}`}
            className="text-[12px] text-blue-600 hover:underline"
          >
            Voir →
          </a>
        </div>
      ) : null}

      {/* Toujours visible : accès au dossier complet de l'opportunité (description, scoring, documents PME) */}
      <a
        href={`/investor/opportunites/${inv.fundingRequest.id}`}
        className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
      >
        Voir le dossier de l&apos;opportunité →
      </a>
      </div>

      {/* Évolution — échéancier de remboursement (dates, statuts, réclamation), chargé au dépliage */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <p className="px-5 pt-4 text-[12px] font-semibold text-slate-900">Évolution du remboursement</p>
          <ScheduleTimeline investmentId={inv.id} />
        </div>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function PortefeuillePage() {
  const { investments, isLoading, error, refresh } = useInvestorData();
  const { markAllAsReadForLink } = useNotifications();
  useNegotiationSocket(refresh);

  // Efface le badge "nouvellement confirmée" du menu dès que l'investisseur consulte la page.
  useEffect(() => {
    markAllAsReadForLink("/investor/portefeuille");
  }, [markAllAsReadForLink]);

  const stats = useMemo(() => {
    const active = investments.filter((i) =>
      ["NEGOTIATING", "COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status),
    );
    const committed = investments.filter((i) =>
      ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status) && i.lockedReturn,
    );
    const settled = investments.filter((i) => i.status === "SETTLED_OFF_PLATFORM");
    // Capital réellement investi = viré et validé par un admin (SETTLED_OFF_PLATFORM), pas un simple engagement
    const totalCommitted = settled.reduce((s, i) => s + Number(i.amountCommitted), 0);
    const avgReturn =
      committed.length > 0
        ? committed.reduce((s, i) => s + Number(i.lockedReturn), 0) / committed.length
        : 0;
    const totalGains = committed.reduce(
      (s, i) => s + (Number(i.amountCommitted) * Number(i.lockedReturn)) / 100,
      0,
    );
    const pmeCount = new Set(active.map((i) => i.fundingRequest.organization.legalName)).size;
    const catCount = new Set(active.map((i) => i.fundingRequest.category)).size;

    return { active, totalCommitted, avgReturn, totalGains, settled, pmeCount, catCount };
  }, [investments]);

  // Allocation by category (même base que le capital investi : uniquement le réglé/validé)
  const allocation = useMemo(() => {
    const byCategory: Record<string, number> = {};
    stats.settled.forEach((inv) => {
      const cat = inv.fundingRequest.category;
      byCategory[cat] = (byCategory[cat] ?? 0) + Number(inv.amountCommitted);
    });
    return Object.entries(byCategory).map(([cat, amount]) => ({
      cat,
      amount,
      pct: stats.totalCommitted > 0
        ? Math.round((amount / stats.totalCommitted) * 100)
        : 0,
      color: CATEGORY_COLORS[cat] ?? "#94a3b8",
      dot: CATEGORY_DOT[cat] ?? "bg-slate-400",
      label: CATEGORY_LABELS[cat] ?? cat,
    }));
  }, [stats]);

  // Prochains paiements — COMMITTED investments with an estimated due date
  const prochainsPaiements = useMemo(() => {
    return investments
      .filter((i) => i.status === "COMMITTED" && i.fundingRequest.durationMonths)
      .map((i) => {
        const dur = i.fundingRequest.durationMonths!;
        const due = addMonths(new Date(i.createdAt), dur);
        const rate = getEffectiveReturn(i);
        const amount = Number(i.amountCommitted);
        const payout = rate != null ? Math.round(amount * (1 + rate / 100) / dur) : null;
        return { inv: i, due, payout };
      })
      .sort((a, b) => a.due.getTime() - b.due.getTime())
      .slice(0, 4);
  }, [investments]);

  const perfLabel = getPerformanceLabel(stats.avgReturn);

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Mon portefeuille</p>
          <p className="text-xs text-slate-500">Gestion de vos investissements actifs</p>
        </div>
        <NotifBell href="/investor/notifications" />
      </header>

      <div className="p-8 pb-16">

        {error && (
          <div className="mb-5 rounded-[10px] bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
        )}

        {/* ── Stat cards ── */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="text-[12px] font-medium text-slate-500">Capital investi</p>
            <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight text-slate-900">
              {isLoading ? "…" : formatCompactAmount(stats.totalCommitted)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {isLoading ? "" : `${stats.totalCommitted.toLocaleString("fr-FR")} F CFA`}
            </p>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="text-[12px] font-medium text-slate-500">Investissements actifs</p>
            <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight text-slate-900">
              {isLoading ? "…" : stats.active.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">En cours</p>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="text-[12px] font-medium text-slate-500">Rendement moyen</p>
            <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight text-green-600">
              {isLoading ? "…" : stats.avgReturn > 0 ? `${stats.avgReturn.toFixed(2)}%` : "—"}
            </p>
            {stats.avgReturn > 0 && (
              <p className="mt-1 text-[11px] text-green-500">→ {perfLabel}</p>
            )}
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="text-[12px] font-medium text-slate-500">Gains totaux</p>
            <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight text-green-600">
              {isLoading ? "…" : stats.totalGains > 0 ? formatCompactAmount(stats.totalGains) : "—"}
            </p>
            {stats.totalGains > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                {stats.totalGains.toLocaleString("fr-FR")} F CFA
              </p>
            )}
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-3 gap-5">

          {/* Left : investment list */}
          <div className="col-span-2 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-[14px] font-semibold text-slate-900">Mes investissements</p>
            </div>

            {isLoading && (
              <p className="p-8 text-center text-[13px] text-slate-400">Chargement...</p>
            )}

            {!isLoading && investments.length === 0 && (
              <div className="flex flex-col items-center px-5 py-16 text-center">
                <p className="text-[15px] font-semibold text-slate-900">Aucun investissement</p>
                <p className="mt-1.5 text-[13px] text-slate-500">
                  Commencez à investir dans des PME africaines.
                </p>
                <a
                  href="/investor/explorer"
                  className="mt-4 rounded-[8px] bg-blue-700 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-800"
                >
                  Explorer les opportunités
                </a>
              </div>
            )}

            {investments.map((inv) => (
              <InvestmentCard key={inv.id} inv={inv} />
            ))}
          </div>

          {/* Right : sidebar */}
          <div className="space-y-4">

            {/* Allocation donut chart */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-4 text-[13px] font-semibold text-slate-900">
                Allocation du portefeuille
              </p>

              {allocation.length === 0 ? (
                <p className="text-[12px] text-slate-400">Aucun capital investi validé pour le moment.</p>
              ) : (
                <>
                  <div className="mb-5 flex justify-center">
                    <DonutChart segments={allocation.map((a) => ({ color: a.color, pct: a.pct }))} />
                  </div>
                  <div className="space-y-2">
                    {allocation.map((a) => (
                      <div key={a.cat} className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
                          <span className="text-slate-600">{a.label}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{a.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Diversification */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-3 text-[13px] font-semibold text-slate-900">Diversification</p>
              <div className="space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nb de PME</span>
                  <span className="font-semibold text-slate-900">{stats.pmeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Secteurs</span>
                  <span className="font-semibold text-slate-900">{stats.catCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Risque moyen</span>
                  <span className="font-semibold text-green-600">Faible</span>
                </div>
              </div>
            </div>

            {/* Prochains paiements */}
            {prochainsPaiements.length > 0 && (
              <div className="rounded-[18px] border border-slate-200 bg-white p-5">
                <p className="mb-3 text-[13px] font-semibold text-slate-900">Prochains paiements</p>
                <div className="space-y-3">
                  {prochainsPaiements.map(({ inv, due, payout }) => (
                    <div key={inv.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-slate-900">
                            {inv.fundingRequest.organization.legalName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {due.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12px] font-semibold text-slate-900">
                        {payout ? formatCompactAmount(payout) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lien explorer */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5 text-center">
              <p className="mb-1 text-[13px] font-semibold text-slate-900">
                Diversifier votre portefeuille
              </p>
              <p className="mb-3 text-[11px] text-slate-500">
                Découvrez de nouvelles opportunités.
              </p>
              <a
                href="/investor/explorer"
                className="block rounded-[8px] bg-blue-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-800"
              >
                Explorer les opportunités
              </a>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
