"use client";

import { useState } from "react";
import { UploadZone } from "@/components/upload-zone";

// Approuver un versement (réclamation financement/remboursement) exige la preuve
// du virement réel fait par l'admin hors plateforme + sa date — pas juste un clic.

interface Props {
  title: string;
  fundingRequestId?: string;
  onConfirm: (proofDocumentId: string, paidAt: string) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function ApproveClaimModal({ title, fundingRequestId, onConfirm, onClose, isSubmitting }: Props) {
  const [proofId, setProofId] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="mb-1 text-base font-semibold text-gray-900">{title}</p>
        <p className="mb-4 text-xs text-gray-500">
          Preuve du virement réel effectué hors plateforme + date, requises pour valider.
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-700">Date du versement</label>
        <input
          type="date"
          value={paidAt}
          max={today}
          onChange={(e) => setPaidAt(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-700"
        />

        <label className="mb-1 block text-xs font-medium text-gray-700">Preuve du virement</label>
        {proofId ? (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">Preuve déposée ✓</p>
        ) : (
          <div className="mb-4">
            <UploadZone
              documentType="SETTLEMENT_PROOF"
              fundingRequestId={fundingRequestId}
              onUploaded={(doc) => setProofId(doc.id)}
              compact
            />
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => proofId && paidAt && onConfirm(proofId, paidAt)}
            disabled={!proofId || !paidAt || isSubmitting}
            className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? "Envoi..." : "Confirmer le versement"}
          </button>
        </div>
      </div>
    </div>
  );
}
