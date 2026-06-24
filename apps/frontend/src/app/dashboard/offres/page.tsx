"use client";

import { useMemo } from "react";
import { useOffers } from "@/lib/use-offers";
import { NotifBell } from "@/components/ui/notif-bell";

// ── status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  INTERESTED:           { label: "Intéressé",  badgeClass: "bg-slate-100 text-slate-600" },
  COMMITTED:            { label: "En attente", badgeClass: "bg-amber-50 text-amber-600" },
  SETTLED_OFF_PLATFORM: { label: "Confirmée",  badgeClass: "bg-green-50 text-green-600" },
  CANCELLED:            { label: "Annulée",    badgeClass: "bg-red-50 text-red-600" },
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(v: string | number) {
  const n = Number(v);
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M FCFA`;
  return n.toLocaleString("fr-FR") + " FCFA";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, colorClass = "text-slate-900" }: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <p className="mb-2.5 text-[12px] font-medium text-slate-500">{label}</p>
      <p className={`text-[26px] font-bold leading-none tracking-tight ${colorClass}`}>{value}</p>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function OffresPage() {
  const { offers, isLoading } = useOffers();

  const stats = useMemo(() => {
    const attente  = offers.filter((o) => o.status === "COMMITTED").length;
    const confirme = offers.filter((o) => o.status === "SETTLED_OFF_PLATFORM").length;
    const montant  = offers.reduce((s, o) => s + Number(o.amountCommitted), 0);
    return { total: offers.length, attente, confirme, montant };
  }, [offers]);

  const montantFmt = stats.montant >= 1_000_000
    ? `${(stats.montant / 1_000_000).toFixed(1)} M`
    : stats.montant.toLocaleString("fr-FR");

  return (
    <>
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Offres reçues</p>
          <p className="text-xs text-slate-500">Offres de financement soumises par les investisseurs</p>
        </div>
        <NotifBell />
      </header>

      <div className="p-8 pb-16">

        {/* ── Stats ── */}
        <div className="mb-5 grid grid-cols-4 gap-3.5">
          <StatCard label="Offres reçues"  value={String(stats.total)} />
          <StatCard label="En attente"     value={String(stats.attente)}  colorClass="text-blue-600" />
          <StatCard label="Confirmées"     value={String(stats.confirme)} colorClass="text-green-600" />
          <StatCard label="Montant total"  value={montantFmt} />
        </div>

        {/* ── Table ── */}
        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          {isLoading ? (
            <p className="p-8 text-center text-[13px] text-slate-400">Chargement...</p>
          ) : offers.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <svg
                width="52" height="52" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.5"
                className="mb-4 opacity-[0.18]"
              >
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
              <p className="text-[15px] font-semibold text-slate-900">Aucune offre pour l'instant</p>
              <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-slate-500">
                Les offres des investisseurs apparaîtront ici dès que votre demande sera visible sur la plateforme.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["Demande", "Investisseur", "Montant", "Date", "Statut"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => {
                    const s = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG.COMMITTED;
                    return (
                      <tr
                        key={offer.id}
                        className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-semibold text-slate-900">{offer.fundingRequest.title}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{offer.fundingRequest.currency}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-medium text-blue-600">
                            {offer.investor.firstName} {offer.investor.lastName}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-bold text-slate-900">
                            {fmtAmount(offer.amountCommitted)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-slate-500">
                          {fmtDate(offer.createdAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.badgeClass}`}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
