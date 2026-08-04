"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useInvestorData } from "@/lib/use-investor-data";
import { NotifBell } from "@/components/ui/notif-bell";
import { formatCompactAmount } from "@/lib/admin-ui";

// ── constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Facture",
  PRET:    "Prêt",
  EQUITY:  "Equity",
};

const CATEGORY_BADGE: Record<string, string> = {
  FACTURE: "bg-blue-950 text-white",
  PRET:    "bg-green-100 text-green-700",
  EQUITY:  "bg-amber-100 text-amber-700",
};

const DONUT_CONFIG: Record<string, { label: string; hex: string; dotClass: string }> = {
  FACTURE: { label: "Affacturage", hex: "#1e3a8a", dotClass: "bg-blue-900" },
  PRET:    { label: "Prêt",        hex: "#16a34a", dotClass: "bg-green-600" },
  EQUITY:  { label: "Equity",      hex: "#d97706", dotClass: "bg-amber-500" },
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtFull(v: string | number) {
  return `${Number(v).toLocaleString("fr-FR")} F CFA`;
}

// ── donut chart ───────────────────────────────────────────────────────────────

function DonutChart({ segments }: {
  segments: { key: string; value: number; pct: number }[];
}) {
  const r = 38;
  const C = 2 * Math.PI * r;
  let cumPct = 0;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {segments.map((seg) => {
        const dashLen = seg.pct * C;
        const offset  = C * 0.25 - cumPct * C;
        cumPct += seg.pct;
        return (
          <circle
            key={seg.key}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={DONUT_CONFIG[seg.key]?.hex ?? "#94a3b8"}
            strokeWidth="18"
            strokeDasharray={`${dashLen} ${C - dashLen}`}
            strokeDashoffset={offset}
          />
        );
      })}
      {/* Inner white circle */}
      <circle cx="50" cy="50" r="28" fill="white" />
    </svg>
  );
}

// ── line chart placeholder ────────────────────────────────────────────────────

function LineChartPlaceholder() {
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun"];
  const points = [
    [0, 70], [1, 62], [2, 52], [3, 45], [4, 35], [5, 20],
  ];
  const w = 100, h = 80;
  const xs = (i: number) => 8 + (i / (points.length - 1)) * 84;
  const ys = (y: number) => (y / 100) * h;

  const d = points.map(([i, y], idx) =>
    `${idx === 0 ? "M" : "L"} ${xs(i)} ${ys(y)}`
  ).join(" ");

  return (
    <div className="relative w-full">
      <div className="flex items-end justify-between px-1 mb-1">
        {["14%", "12%", "8%", "4%", "0%"].map((v) => (
          <span key={v} className="text-[10px] text-slate-400">{v}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 120 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="8" y1={ys(y)} x2="92" y2={ys(y)} stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
        {/* Area fill */}
        <path
          d={`${d} L ${xs(5)} ${h} L ${xs(0)} ${h} Z`}
          fill="url(#chartGrad)"
        />
        {/* Line */}
        <path d={d} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map(([i, y]) => (
          <circle key={i} cx={xs(i)} cy={ys(y)} r="2" fill="#16a34a" />
        ))}
      </svg>
      <div className="flex justify-between px-1 mt-1">
        {months.map((m) => (
          <span key={m} className="text-[10px] text-slate-400">{m}</span>
        ))}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function InvestorDashboardPage() {
  const { investments, opportunities, isLoading, error } = useInvestorData();

  const settledInvestments = investments.filter((i) => i.status === "SETTLED_OFF_PLATFORM");
  const totalCommitted = settledInvestments.reduce((s, i) => s + Number(i.amountCommitted), 0);
  const activeCount = investments.filter((i) =>
    ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status),
  ).length;
  const pmeCount = new Set(investments.map((i) => i.fundingRequest.organization.legalName)).size;

  // Répartition du portefeuille (capital réellement investi, i.e. viré et validé)
  const donutSegments = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const inv of settledInvestments) {
      const cat = inv.fundingRequest.category;
      totals[cat] = (totals[cat] ?? 0) + Number(inv.amountCommitted);
    }
    const grand = Object.values(totals).reduce((s, v) => s + v, 0);
    return Object.entries(totals).map(([key, value]) => ({
      key,
      value,
      pct: grand > 0 ? value / grand : 0,
    }));
  }, [investments]);

  return (
    <>
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Dashboard Investisseur</p>
          <p className="text-xs text-slate-500">Gérez vos investissements en toute simplicité</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/investor/explorer"
            className="flex items-center gap-2 rounded-[10px] bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Explorer les opportunités
          </Link>
          <NotifBell href="/investor/notifications" />
        </div>
      </header>

      <div className="p-8 pb-16">

        {error && (
          <div className="mb-5 rounded-[10px] bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">{error}</div>
        )}

        {/* ── Stat cards ── */}
        <div className="mb-5 grid grid-cols-5 gap-3.5">

          {/* 1 — Valeur portefeuille (réel) */}
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">Valeur du portefeuille</p>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight text-slate-900">
              {isLoading ? "…" : formatCompactAmount(totalCommitted)}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-400">{fmtFull(totalCommitted)}</p>
          </div>

          {/* 2 — Investissements actifs (réel) */}
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">Investissements actifs</p>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight text-slate-900">
              {isLoading ? "…" : activeCount}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-400">Répartis sur {pmeCount} PME</p>
          </div>

          {/* 3 — Rendement moyen (à venir) */}
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">Rendement moyen</p>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2">
                <polyline points="23 6 13.5 20.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight text-slate-400">—</p>
            <p className="mt-1.5 text-[11px] text-slate-400">Module gains à venir</p>
          </div>

          {/* 4 — Gains totaux (à venir) */}
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">Gains totaux</p>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2">
                <polyline points="23 6 13.5 20.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight text-slate-400">—</p>
            <p className="mt-1.5 text-[11px] text-slate-400">Module gains à venir</p>
          </div>

          {/* 5 — TRI (à venir) */}
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">TRI annualisé</p>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight text-slate-400">—</p>
            <p className="mt-1.5 text-[11px] text-slate-400">Module gains à venir</p>
          </div>

        </div>

        {/* ── Investissements + Opportunités ── */}
        <div className="mb-4 grid grid-cols-2 gap-4">

          {/* Mes investissements en cours */}
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="text-[13px] font-bold text-slate-900">Mes investissements en cours</p>
              <Link href="/investor/portefeuille" className="text-[12px] font-semibold text-blue-600 hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading && <p className="p-5 text-[13px] text-slate-400">Chargement...</p>}
              {!isLoading && investments.length === 0 && (
                <p className="p-5 text-[13px] text-slate-400">Aucun investissement pour le moment.</p>
              )}
              {investments.slice(0, 5).map((inv) => {
                const requested = Number(inv.fundingRequest.amountRequested);
                const raised    = Number(inv.fundingRequest.amountRaised);
                const progress  = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;
                return (
                  <div key={inv.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900">
                          {inv.fundingRequest.organization.legalName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {CATEGORY_LABELS[inv.fundingRequest.category] ?? inv.fundingRequest.category}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-bold text-slate-900">
                          {fmtFull(inv.amountCommitted)}
                        </p>
                        {inv.lockedReturn && (
                          <p className="text-[11px] font-semibold text-green-600">
                            {Number(inv.lockedReturn)}% rendement
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Progression</span>
                        <span className="text-[11px] font-medium text-slate-600">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nouvelles opportunités */}
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="text-[13px] font-bold text-slate-900">Nouvelles opportunités</p>
              <Link href="/investor/explorer" className="text-[12px] font-semibold text-blue-600 hover:underline">
                Explorer
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading && <p className="p-5 text-[13px] text-slate-400">Chargement...</p>}
              {!isLoading && opportunities.length === 0 && (
                <p className="p-5 text-[13px] text-slate-400">Aucune opportunité disponible.</p>
              )}
              {opportunities.slice(0, 3).map((opp) => (
                <div key={opp.id} className="px-5 py-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-bold text-slate-900">
                      {opp.organization.legalName}
                    </p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CATEGORY_BADGE[opp.category] ?? "bg-slate-100 text-slate-600"}`}>
                      {CATEGORY_LABELS[opp.category] ?? opp.category}
                    </span>
                  </div>
                  <p className="mb-3 text-[12px] text-slate-500 line-clamp-1">{opp.title}</p>
                  <div className="mb-3 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] font-medium text-slate-400">Montant</p>
                      <p className="text-[13px] font-bold text-slate-900">{formatCompactAmount(Number(opp.amountRequested))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-400">Rendement</p>
                      <p className="text-[13px] font-bold text-green-600">
                        {opp.expectedReturn ? `${Number(opp.expectedReturn)}%` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-400">Risque</p>
                      <p className="text-[13px] font-medium text-slate-400">Non évalué</p>
                    </div>
                  </div>
                  <Link
                    href={`/investor/opportunites/${opp.id}`}
                    className="block rounded-[8px] bg-slate-900 py-2 text-center text-[12px] font-semibold text-white transition hover:bg-slate-800"
                  >
                    Voir l'opportunité
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Répartition + Rendement mensuel ── */}
        <div className="mb-4 grid grid-cols-2 gap-4">

          {/* Répartition du portefeuille */}
          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <p className="mb-4 text-[13px] font-bold text-slate-900">Répartition du portefeuille</p>
            {donutSegments.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-[13px] text-slate-400">
                Aucune donnée à afficher
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="h-32 w-32 shrink-0">
                  <DonutChart segments={donutSegments} />
                </div>
                <div className="flex-1 space-y-2.5">
                  {donutSegments.map((seg) => {
                    const cfg = DONUT_CONFIG[seg.key];
                    return (
                      <div key={seg.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg?.dotClass ?? "bg-slate-400"}`} />
                          <span className="text-[12px] text-slate-600">{cfg?.label ?? seg.key}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[12px] font-bold text-slate-900">{(seg.pct * 100).toFixed(0)}%</span>
                          <p className="text-[10px] text-slate-400">{fmtFull(seg.value)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Rendement mensuel */}
          <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-bold text-slate-900">Rendement mensuel (%)</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                Aperçu
              </span>
            </div>
            <LineChartPlaceholder />
          </div>

        </div>

        {/* ── Mes objectifs ── */}
        <div>
          <p className="mb-3 text-[13px] font-bold text-slate-900">Mes objectifs</p>
          <div className="grid grid-cols-3 gap-4">

            {/* Faible risque — Atteint */}
            <div className="rounded-[14px] border border-green-200 bg-green-50 px-5 py-4">
              <div className="mb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <p className="text-[13px] font-bold text-slate-900">Faible risque</p>
              </div>
              <p className="mb-2 text-[11px] font-semibold text-green-600">Atteint</p>
              <p className="text-[11px] text-slate-500">Portefeuille BBB+ moyen</p>
            </div>

            {/* Rendement cible — En cours */}
            <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-4">
              <div className="mb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-[13px] font-bold text-slate-900">Rendement cible 12%+</p>
              </div>
              <p className="mb-2 text-[11px] font-semibold text-amber-600">En cours</p>
              <p className="text-[11px] text-slate-500">Actuel : — (données à venir)</p>
            </div>

            {/* Diversification — En cours */}
            <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-4">
              <div className="mb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-[13px] font-bold text-slate-900">Diversification 3 secteurs</p>
              </div>
              <p className="mb-2 text-[11px] font-semibold text-amber-600">En cours</p>
              <p className="text-[11px] text-slate-500">Actuel : {donutSegments.length}/3 secteurs</p>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
