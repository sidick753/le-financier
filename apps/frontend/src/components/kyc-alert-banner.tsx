"use client";

import Link from "next/link";
import { useKycStatus } from "@/lib/use-kyc-status";

export function KycAlertBanner() {
  const { items, isLoading } = useKycStatus();

  if (isLoading) return null;

  const missing = items.filter((i) => i.status === "MISSING").length;
  if (missing === 0) return null;

  return (
    <div className="mx-8 mt-4 flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-bold text-blue-900">Complétez votre dossier KYC</p>
          <p className="mt-0.5 text-[12px] text-blue-700">
            {missing} document{missing !== 1 ? "s" : ""} manquant{missing !== 1 ? "s" : ""} — requis pour la
            vérification de votre compte et l'étude de vos demandes de financement.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/documents"
        className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700"
      >
        Ajouter mes documents
      </Link>
    </div>
  );
}
