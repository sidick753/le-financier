"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { RejectReasonModal } from "@/components/reject-reason-modal";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { formatAdminDate, formatFullAmount } from "@/lib/admin-ui";

interface PendingPayment {
  id: string;
  amountPaid: string;
  paidAt: string;
  createdAt: string;
  proofDocumentId: string | null;
  repaymentSchedule: {
    dueDate: string;
    nature: string;
    fundingRequest: { id: string; title: string };
    investment: {
      investor: { firstName: string; lastName: string };
    };
  };
}

export default function AdminRemboursementsPage() {
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();

  const [payments, setPayments] = useState<PendingPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  function load() {
    if (!token) return;
    api
      .get<PendingPayment[]>("/repayments/admin/pending", token)
      .then(setPayments)
      .catch(() => setError("Impossible de charger les remboursements en attente."));
  }

  useEffect(load, [token]);

  async function handleApprove(paymentId: string) {
    setActionId(paymentId);
    try {
      await api.patch(`/repayments/payment/${paymentId}/approve`, {}, token!);
      load();
      refreshBadges();
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(reason: string) {
    if (!rejectFor) return;
    setActionId(rejectFor);
    try {
      await api.patch(`/repayments/payment/${rejectFor}/reject`, { reason }, token!);
      setRejectFor(null);
      load();
      refreshBadges();
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Remboursements à valider</h1>
      <p className="mb-6 text-sm text-gray-500">
        Une PME rembourse sur le compte de la plateforme, dépose un justificatif, puis un admin valide avant
        que le montant (commission déduite) soit reversé à l'investisseur concerné.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!payments && !error && <p className="text-sm text-gray-400">Chargement...</p>}

      {payments && payments.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Aucun remboursement en attente de validation.
        </div>
      )}

      {payments && payments.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {payments.map((p) => {
              const investor = p.repaymentSchedule.investment.investor;
              const isPending = actionId === p.id;
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      <Link
                        href={`/admin/opportunites/${p.repaymentSchedule.fundingRequest.id}`}
                        className="hover:text-brand-700 hover:underline"
                      >
                        {p.repaymentSchedule.fundingRequest.title}
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500">
                      Pour {investor.firstName} {investor.lastName} · {formatFullAmount(Number(p.amountPaid))}
                      {" · "}soumis le {formatAdminDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.proofDocumentId && (
                      <button
                        onClick={() => setPreviewDocId(p.proofDocumentId)}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Voir la preuve
                      </button>
                    )}
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={isPending}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => setRejectFor(p.id)}
                      disabled={isPending}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rejectFor && (
        <RejectReasonModal
          title="Rejeter la preuve de remboursement"
          confirmLabel="Confirmer le rejet"
          isSubmitting={actionId === rejectFor}
          onClose={() => setRejectFor(null)}
          onConfirm={handleReject}
        />
      )}

      {previewDocId && (
        <DocumentPreviewModal documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}
    </div>
  );
}
