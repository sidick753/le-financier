"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useRepaymentSchedule } from "@/lib/use-repayment-schedule";
import { CLAIM_STATUS_CONFIG } from "@/lib/admin-ui";
import { alertError, alertSuccess } from "@/lib/alert";

// Échéancier de remboursement d'un investissement (dates, statuts, réclamation des
// fonds déjà validés) — partagé entre le portefeuille investisseur individuel et le
// portefeuille institution, les deux consommant `GET /investments/mine`.

const SCHEDULE_NATURE_LABELS: Record<string, string> = {
  INTEREST: "Intérêt",
  INSTALLMENT: "Échéance",
  FINAL_PAYMENT: "Solde final",
};

const SCHEDULE_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "À venir", cls: "bg-slate-100 text-slate-500" },
  PARTIALLY_PAID: { label: "Partiellement payée", cls: "bg-amber-50 text-amber-700" },
  PAID: { label: "Payée", cls: "bg-green-50 text-green-700" },
  OVERDUE: { label: "En retard", cls: "bg-red-50 text-red-600" },
  CANCELLED: { label: "Annulée", cls: "bg-slate-100 text-slate-400" },
};

interface RepaymentClaimRow {
  id: string;
  amountRequested: string;
  amountNet: string | null;
  status: "REQUESTED" | "PAID" | "REJECTED";
  requestedAt: string;
  rejectionReason: string | null;
}

function fmtFull(v: number): string {
  return `${v.toLocaleString("fr-FR")} F CFA`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function ScheduleTimeline({ investmentId }: { investmentId: string }) {
  const { schedule, isLoading, error } = useRepaymentSchedule(investmentId, true);

  if (isLoading) {
    return <p className="px-5 py-4 text-[12px] text-slate-400">Chargement de l&apos;échéancier...</p>;
  }
  if (error) {
    return <p className="px-5 py-4 text-[12px] text-red-500">{error}</p>;
  }
  if (!schedule || schedule.length === 0) {
    return (
      <p className="px-5 py-4 text-[12px] text-slate-400">
        Échéancier pas encore disponible — il sera généré une fois le virement de la PME validé par la plateforme.
      </p>
    );
  }

  return (
    <div className="space-y-3 px-5 py-4">
      {schedule.map((entry) => {
        const cfg = SCHEDULE_STATUS_CONFIG[entry.status] ?? SCHEDULE_STATUS_CONFIG.PENDING;
        const claimable = entry.status === "PARTIALLY_PAID" || entry.status === "PAID";
        return (
          <div key={entry.id} className="text-[12px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${entry.status === "PAID" ? "bg-green-500" : entry.status === "PARTIALLY_PAID" ? "bg-amber-400" : entry.status === "OVERDUE" ? "bg-red-500" : "bg-slate-300"}`} />
                <div>
                  <p className="font-medium text-slate-700">{fmtDate(entry.dueDate)}</p>
                  <p className="text-[11px] text-slate-400">{SCHEDULE_NATURE_LABELS[entry.nature] ?? entry.nature}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-slate-900">{fmtFull(Number(entry.amountDue))}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
            {claimable && <ClaimAction scheduleId={entry.id} />}
          </div>
        );
      })}
    </div>
  );
}

// Réclamation d'un remboursement déjà validé, avant même que l'échéance soit
// intégralement soldée.
function ClaimAction({ scheduleId }: { scheduleId: string }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [claimable, setClaimable] = useState<number | null>(null);
  const [claims, setClaims] = useState<RepaymentClaimRow[]>([]);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!token) return;
    api.get<number>(`/repayments/schedule/${scheduleId}/claimable`, token).then(setClaimable).catch(() => {});
    api.get<RepaymentClaimRow[]>(`/repayments/schedule/${scheduleId}/claims`, token).then(setClaims).catch(() => {});
  }

  function toggle() {
    if (!open) load();
    setOpen((v) => !v);
  }

  async function submit() {
    if (!token) return;
    setSubmitting(true);
    try {
      const value = amount.trim() ? Number(amount) : undefined;
      await api.post(`/repayments/schedule/${scheduleId}/claims`, { amount: value }, token);
      setAmount("");
      load();
      alertSuccess("Réclamation envoyée, elle est en attente de validation par un admin.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors de la réclamation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-1.5 pl-4">
      <button
        type="button"
        onClick={toggle}
        className="text-[11px] font-medium text-blue-600 hover:underline"
      >
        {open ? "Masquer la réclamation" : "Réclamer les fonds validés"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-slate-50 p-3">
          <p className="text-[11px] text-slate-500">
            Disponible à réclamer :{" "}
            <span className="font-semibold text-slate-900">
              {claimable === null ? "—" : fmtFull(claimable)}
            </span>
          </p>

          {claimable !== null && claimable > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={claimable}
                placeholder={`Tout (${fmtFull(claimable)})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-8 w-40 rounded-lg border border-slate-200 px-2.5 text-[12px] text-slate-900 outline-none focus:border-blue-400"
              />
              <button
                onClick={submit}
                disabled={submitting}
                className="h-8 rounded-lg bg-blue-600 px-3 text-[12px] font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Envoi..." : "Réclamer"}
              </button>
            </div>
          )}

          {claims.length > 0 && (
            <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
              {claims.map((c) => {
                const ccfg = CLAIM_STATUS_CONFIG[c.status] ?? CLAIM_STATUS_CONFIG.REQUESTED;
                return (
                  <div key={c.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">{fmtFull(Number(c.amountRequested))}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${ccfg.className}`}>{ccfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
