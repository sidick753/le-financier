"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { UploadZone } from "@/components/upload-zone";
import { alertError, alertSuccess, confirmDialog } from "@/lib/alert";

// Échéancier de remboursement côté PME — mirror de ScheduleTimeline (portefeuille
// investisseur) mais avec dépôt de preuve au lieu de réclamation : c'est la PME qui
// règle chaque échéance par virement vers le compte LeFinancier, preuve à l'appui,
// jusqu'ici sans aucune UI pour le faire (seul l'endpoint backend existait).

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

interface SchedulePayment {
  id: string;
  amountPaid: string;
  status: "PENDING_VALIDATION" | "CONFIRMED" | "REJECTED" | "DISPUTED";
  rejectionReason: string | null;
  createdAt: string;
}

interface ScheduleEntry {
  id: string;
  dueDate: string;
  amountDue: string;
  nature: "INTEREST" | "INSTALLMENT" | "FINAL_PAYMENT";
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  investment: { investor: { firstName: string; lastName: string } };
  payments: SchedulePayment[];
}

function fmtAmount(v: string | number) {
  return `${Number(v).toLocaleString("fr-FR")} F CFA`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function PmeRepaymentSchedule({ fundingRequestId }: { fundingRequestId: string }) {
  const { token } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Fichier déposé mais pas encore soumis (confirmation requise avant l'appel réel).
  const [pendingUpload, setPendingUpload] = useState<{ scheduleId: string; docId: string } | null>(null);

  function load() {
    if (!token) return;
    api
      .get<ScheduleEntry[]>(`/repayments/funding-request/${fundingRequestId}`, token)
      .then(setSchedule)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [token, fundingRequestId]);

  async function handleProofUploaded(scheduleId: string, doc: { id: string }) {
    setPendingUpload({ scheduleId, docId: doc.id });
    const confirmed = await confirmDialog(
      "Confirmer l'envoi de cette preuve de virement ? Elle sera transmise à un admin pour validation.",
      { confirmText: "Envoyer", danger: false },
    );
    setPendingUpload(null);
    if (!confirmed || !token) return;
    try {
      await api.post(`/repayments/schedule/${scheduleId}/confirm`, { proofDocumentId: doc.id }, token);
      alertSuccess("Preuve transmise — en attente de validation par notre équipe.");
      load();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de l'envoi de la preuve.");
    }
  }

  // Rien à afficher tant qu'aucun virement d'investisseur n'a été validé — c'est
  // seulement à ce moment que l'échéancier est généré (voir InvestmentsService.approveSettlement).
  if (isLoading || !schedule || schedule.length === 0) return null;

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Échéancier de remboursement</h2>
      <p className="mb-4 text-[12px] text-slate-500">
        Chaque échéance se règle par virement vers le compte LeFinancier, preuve à l&apos;appui — validée ensuite par un admin.
      </p>

      <div className="-mx-6 divide-y divide-slate-100 border-t border-slate-100">
        {schedule.map((entry) => {
          const cfg = SCHEDULE_STATUS_CONFIG[entry.status] ?? SCHEDULE_STATUS_CONFIG.PENDING;
          const latestPayment =
            entry.payments.length > 0
              ? [...entry.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
              : null;
          const canSubmit =
            entry.status !== "PAID" &&
            entry.status !== "CANCELLED" &&
            latestPayment?.status !== "PENDING_VALIDATION" &&
            pendingUpload?.scheduleId !== entry.id;

          return (
            <div key={entry.id} className="px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-900">{fmtDate(entry.dueDate)}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {SCHEDULE_NATURE_LABELS[entry.nature] ?? entry.nature}
                    {entry.investment?.investor &&
                      ` · ${entry.investment.investor.firstName} ${entry.investment.investor.lastName}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-900">{fmtAmount(entry.amountDue)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.cls}`}>{cfg.label}</span>
                </div>
              </div>

              {latestPayment && (latestPayment.status === "PENDING_VALIDATION" || latestPayment.status === "REJECTED") && (
                <div
                  className={`mt-2 rounded-lg px-3 py-2 text-[11px] ${
                    latestPayment.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {latestPayment.status === "PENDING_VALIDATION"
                    ? "Preuve soumise, en attente de validation par un admin."
                    : `Preuve rejetée : ${latestPayment.rejectionReason ?? "raison non précisée"}. Merci de resoumettre.`}
                </div>
              )}

              {canSubmit && (
                <div className="mt-2.5">
                  <UploadZone
                    documentType="SETTLEMENT_PROOF"
                    fundingRequestId={fundingRequestId}
                    onUploaded={(doc) => handleProofUploaded(entry.id, doc)}
                    compact
                    deferSubmit
                    submitLabel="Soumettre la preuve"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
