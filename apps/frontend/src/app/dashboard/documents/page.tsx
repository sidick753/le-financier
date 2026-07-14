"use client";

import { useKycStatus } from "@/lib/use-kyc-status";
import { usePmeData } from "@/lib/use-pme-data";
import { UploadZone } from "@/components/upload-zone";
import { NotifBell } from "@/components/ui/notif-bell";

const STATUS_STYLES: Record<string, { icon: React.ReactNode; label: string; badgeClass: string }> = {
  VALIDATED: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    label: "Validé",
    badgeClass: "bg-green-50 text-green-600",
  },
  PENDING_REVIEW: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    label: "En révision",
    badgeClass: "bg-amber-50 text-amber-600",
  },
  MISSING: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    label: "Manquant",
    badgeClass: "bg-red-50 text-red-600",
  },
};

export default function DocumentsPage() {
  const { organization } = usePmeData();
  const { items, isLoading, refresh } = useKycStatus();

  const validated = items.filter((i) => i.status === "VALIDATED").length;
  const total = items.length;

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Documents</p>
          <p className="text-xs text-slate-500">Gestion de vos documents KYC et contractuels</p>
        </div>
        <NotifBell />
      </header>

      <div className="p-8 pb-16">

        {/* Bloc KYC */}
        <div className="mb-5 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[13px] font-bold text-slate-900">Documents obligatoires (KYC)</p>
              {!isLoading && (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {validated} / {total} document{total !== 1 ? "s" : ""} validé{total !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {!isLoading && total > 0 && (
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${(validated / total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {isLoading && <p className="p-5 text-[13px] text-slate-400">Chargement...</p>}

          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const style = STATUS_STYLES[item.status];
              return (
                <div key={item.key} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.badgeClass}`}>
                      {style.icon}
                    </div>
                    <p className="text-[13px] font-medium text-slate-800">{item.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.badgeClass}`}>
                      {style.label}
                    </span>
                    {item.status === "MISSING" && organization && (
                      <UploadZone
                        organizationId={organization.id}
                        documentType={item.documentType}
                        kycRequirementKey={item.key}
                        onUploaded={refresh}
                        compact
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bloc contractuels
        <div className="mb-5 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-[13px] font-bold text-slate-900">Documents contractuels</p>
          </div>
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-slate-900">Contrats & signature électronique</p>
            <p className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-slate-500">
              La gestion des contrats et la signature électronique arrivent bientôt.
            </p>
          </div>
        </div> */}

        {/* Bloc upload libre */}
        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-[13px] font-bold text-slate-900">Ajouter un document</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Tout autre document utile à votre dossier</p>
          </div>
          <div className="p-5">
            {organization ? (
              <UploadZone
                organizationId={organization.id}
                documentType="OTHER"
                onUploaded={refresh}
                requireTitle
              />
            ) : (
              <p className="text-[13px] text-slate-400">Organisation non chargée.</p>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
