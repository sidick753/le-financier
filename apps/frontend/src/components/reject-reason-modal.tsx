"use client";

import { useState } from "react";

interface Props {
  title: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isSubmitting?: boolean;
  description?: string;
}

export function RejectReasonModal({
  title,
  confirmLabel,
  onConfirm,
  onClose,
  isSubmitting,
  description = "Ce motif sera communiqué à la PME.",
}: Props) {
  const [reason, setReason] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="mb-1 text-base font-semibold text-gray-900">{title}</p>
        <p className="mb-4 text-xs text-gray-500">
          {description}
        </p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Expliquez la raison du rejet..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-700"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || isSubmitting}
            className="rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? "Envoi..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
