"use client";

import Link from "next/link";
import { useOrganizationProfileStatus } from "@/lib/use-organization-profile";

export function CompanyProfileAlertBanner() {
  const { isComplete, isLoading } = useOrganizationProfileStatus();

  if (isLoading || isComplete) return null;

  return (
    <div className="mx-8 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-bold text-amber-900">Complétez le profil de votre entreprise</p>
          <p className="mt-0.5 text-[12px] text-amber-700">
            Secteur, santé financière, profil du dirigeant — ces informations sont utilisées par notre
            moteur de scoring pour évaluer vos demandes de financement.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/parametres"
        className="shrink-0 rounded-lg bg-amber-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-amber-700"
      >
        Compléter mon profil
      </Link>
    </div>
  );
}
