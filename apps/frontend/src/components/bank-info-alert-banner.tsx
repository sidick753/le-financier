"use client";

import Link from "next/link";
import { useBankInfoStatus } from "@/lib/use-organization-profile";

export function BankInfoAlertBanner() {
  const { isComplete, isLoading } = useBankInfoStatus();

  if (isLoading || isComplete) return null;

  return (
    <div className="mx-8 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M6 15h4" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-bold text-amber-900">Complétez vos informations bancaires</p>
          <p className="mt-0.5 text-[12px] text-amber-700">
            Titulaire et numéro de compte sont indispensables pour recevoir les décaissements de fonds
            validés par la plateforme.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/parametres?tab=bancaire"
        className="shrink-0 rounded-lg bg-amber-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-amber-700"
      >
        Compléter mes infos bancaires
      </Link>
    </div>
  );
}
