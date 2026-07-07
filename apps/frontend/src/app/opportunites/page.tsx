"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useOpportunities, type Opportunity } from "@/lib/use-opportunities";

const CATEGORIES = [
  { value: "",        label: "Tous les types" },
  { value: "FACTURE", label: "Facture" },
  { value: "PRET",    label: "Prêt" },
  { value: "EQUITY",  label: "Equity" },
];

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

function fmtFull(v: string | number, currency = "F CFA") {
  return `${Number(v).toLocaleString("fr-FR")} ${currency}`;
}

function fmtDuration(months: number | null, category: string) {
  if (!months) return category === "EQUITY" ? "Long terme" : "—";
  if (category === "FACTURE") return `${months * 30} jours`;
  return `${months} mois`;
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const badge = CATEGORY_BADGE[opp.category] ?? "bg-slate-100 text-slate-600";
  const label = CATEGORY_LABELS[opp.category] ?? opp.category;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <div className="mb-1 flex items-start justify-between gap-2.5">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{opp.organization.legalName}</span>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge}`}>{label}</span>
      </div>
      <div className="mb-4 text-xs text-blue-700">{opp.title}</div>

      <div className="flex items-center justify-between border-b border-gray-100 py-[9px] text-sm">
        <span className="font-medium text-slate-500">Montant</span>
        <span className="font-medium text-slate-900">{fmtFull(opp.amountRequested, opp.currency)}</span>
      </div>
      <div className="flex items-center justify-between border-b border-gray-100 py-[9px] text-sm">
        <span className="font-medium text-slate-500">Durée</span>
        <span className="font-medium text-slate-900">{fmtDuration(opp.durationMonths, opp.category)}</span>
      </div>
      <div className="flex items-center justify-between py-[9px] text-sm">
        <span className="font-medium text-slate-500">Rendement</span>
        <span className="font-medium text-green-600">{opp.expectedReturn ? `${Number(opp.expectedReturn)}%` : "—"}</span>
      </div>

      <Link href="/login" className="mt-4 flex h-[42px] w-full items-center justify-center rounded-lg bg-blue-700 text-sm font-medium text-white transition hover:bg-blue-800">
        Voir les détails
      </Link>
    </div>
  );
}

export default function OpportunitesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const { opportunities, isLoading } = useOpportunities({ category, search });

  return (
    <>
      <Navbar />

      {/* ══ HERO ══ */}
      <section className="py-16 text-center text-white" style={{ background: "linear-gradient(120deg,#1a3fb5 0%,#1d4ed8 45%,#2563eb 100%)" }}>
        <div className="mx-auto w-full max-w-[720px] px-5">
          <h1 className="text-[clamp(26px,4vw,38px)] font-semibold tracking-[-0.03em]">Opportunités d&apos;investissement</h1>
          <p className="mt-3 text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            Découvrez les PME qui recherchent un financement et investissez selon votre profil de risque
          </p>
        </div>
      </section>

      {/* ══ LISTE ══ */}
      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-[1460px] px-5">

          {/* Filtres */}
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher par entreprise ou titre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-gray-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-[10px] border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* États */}
          {isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
              ))}
            </div>
          )}

          {!isLoading && opportunities.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
              <p className="text-[15px] font-semibold text-slate-900">Aucune opportunité pour le moment</p>
              <p className="mt-1 text-sm text-slate-500">Revenez bientôt, de nouvelles opportunités sont publiées régulièrement.</p>
            </div>
          )}

          {!isLoading && opportunities.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opp={opp} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
