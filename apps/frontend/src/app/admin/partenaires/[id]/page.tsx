"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { KYC_STATUS_CONFIG, formatAdminDate, formatFullAmount } from "@/lib/admin-ui";
import { alertError, alertSuccess } from "@/lib/alert";
import { NotifBell } from "@/components/ui/notif-bell";
import { RejectReasonModal } from "@/components/reject-reason-modal";

const MEMBER_ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ANALYST: "Analyste",
  COMPLIANCE: "Conformité",
};

const MEMBER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Actif", className: "bg-green-100 text-green-700" },
  TRAINING: { label: "En formation", className: "bg-gray-100 text-gray-600" },
};

interface InstitutionDetail {
  id: string;
  name: string;
  type: string | null;
  bceaoApprovalNumber: string | null;
  country: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  envelopeMax: string | null;
  ticketMin: string | null;
  ticketMax: string | null;
  createdAt: string;
  members: Array<{
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    kycStatus: string;
    kycRejectionReason: string | null;
    role: string;
    status: string;
    specialty: string | null;
    dossiersActifs: number;
    encoursGere: number;
  }>;
  totalEngaged: number;
}

export default function AdminPartenaireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();

  const [institution, setInstitution] = useState<InstitutionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [kycRejectUserId, setKycRejectUserId] = useState<string | null>(null);

  function load() {
    if (!token) return;
    if (!institution) setIsLoading(true);
    api
      .get<InstitutionDetail>(`/institutions/admin/${id}`, token)
      .then(setInstitution)
      .catch(() => setError("Impossible de charger ce partenaire."))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id, token]);

  async function handleVerifyKyc(userId: string) {
    setActionLoading(true);
    try {
      await api.patch(`/auth/admin/users/${userId}/verify-kyc`, {}, token!);
      load();
      refreshBadges();
      alertSuccess("KYC validé.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de l'action.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectKyc(reason: string) {
    if (!kycRejectUserId) return;
    setActionLoading(true);
    try {
      await api.patch(`/auth/admin/users/${kycRejectUserId}/reject-kyc`, { reason }, token!);
      setKycRejectUserId(null);
      load();
      refreshBadges();
      alertSuccess("KYC rejeté.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de l'action.");
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-400">Chargement...</div>;
  }

  if (error || !institution) {
    return <div className="p-8 text-sm text-red-500">{error ?? "Partenaire introuvable."}</div>;
  }

  const owner = institution.members.find((m) => m.role === "OWNER") ?? institution.members[0];
  const config = owner ? KYC_STATUS_CONFIG[owner.kycStatus] ?? KYC_STATUS_CONFIG.PENDING : null;

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.push("/admin/partenaires")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-black tracking-tight text-gray-900">{institution.name}</p>
              {config && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}>
                  {config.label}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-gray-500">
              {institution.type ?? "Institution"}
              {institution.bceaoApprovalNumber && ` · Agrément ${institution.bceaoApprovalNumber}`}
              {" · "}Inscrit le {formatAdminDate(institution.createdAt)}
            </p>
            {owner?.kycStatus === "REJECTED" && owner.kycRejectionReason && (
              <p className="mt-0.5 truncate text-xs text-red-600">Motif : {owner.kycRejectionReason}</p>
            )}
          </div>
        </div>

        {owner && (
          <div className="flex shrink-0 gap-2">
            {owner.kycStatus === "PENDING" && (
              <>
                <button
                  onClick={() => handleVerifyKyc(owner.userId)}
                  disabled={actionLoading}
                  className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Valider
                </button>
                <button
                  onClick={() => setKycRejectUserId(owner.userId)}
                  disabled={actionLoading}
                  className="rounded-md border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Rejeter
                </button>
              </>
            )}
            {owner.kycStatus === "VERIFIED" && (
              <button
                onClick={() => setKycRejectUserId(owner.userId)}
                disabled={actionLoading}
                className="rounded-md border border-orange-200 px-4 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                Suspendre
              </button>
            )}
            {owner.kycStatus === "REJECTED" && (
              <button
                onClick={() => handleVerifyKyc(owner.userId)}
                disabled={actionLoading}
                className="rounded-md bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Réactiver
              </button>
            )}
          </div>
        )}
        <NotifBell href="/admin/notifications" />
      </header>

      <div className="p-8">
      {/* Infos générales */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <InfoCard
          label="Plafond enveloppe"
          value={institution.envelopeMax ? formatFullAmount(Number(institution.envelopeMax)) : "—"}
        />
        <InfoCard
          label="Ticket min / max"
          value={
            institution.ticketMin && institution.ticketMax
              ? `${formatFullAmount(Number(institution.ticketMin))} — ${formatFullAmount(Number(institution.ticketMax))}`
              : "—"
          }
        />
        <InfoCard label="Volume engagé" value={formatFullAmount(institution.totalEngaged)} />
        <InfoCard label="Membres" value={institution.members.length.toString()} />
      </div>

      {/* Membres */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-base font-semibold text-gray-900">Membres</p>
        </div>
        <div className="divide-y divide-gray-100">
          {institution.members.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucun membre.</p>
          )}
          {institution.members.map((m) => {
            const kycConfig = KYC_STATUS_CONFIG[m.kycStatus] ?? KYC_STATUS_CONFIG.PENDING;
            const statusConfig = MEMBER_STATUS_CONFIG[m.status] ?? MEMBER_STATUS_CONFIG.ACTIVE;
            return (
              <div key={m.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {MEMBER_ROLE_LABELS[m.role] ?? m.role}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}>
                    {statusConfig.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kycConfig.className}`}>
                    {kycConfig.label}
                  </span>
                </div>
                <div className="w-32 text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {m.dossiersActifs} dossier{m.dossiersActifs !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {m.encoursGere > 0 ? formatFullAmount(m.encoursGere) : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {kycRejectUserId && (
        <RejectReasonModal
          title="Rejeter le KYC de ce contact"
          confirmLabel="Confirmer le rejet"
          isSubmitting={actionLoading}
          onClose={() => setKycRejectUserId(null)}
          onConfirm={handleRejectKyc}
        />
      )}
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
