"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { KYC_STATUS_CONFIG, formatAdminDate, formatFullAmount } from "@/lib/admin-ui";
import { alertError, alertSuccess } from "@/lib/alert";

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

  function load() {
    if (!token) return;
    setIsLoading(true);
    api
      .get<InstitutionDetail>(`/institutions/admin/${id}`, token)
      .then(setInstitution)
      .catch(() => setError("Impossible de charger ce partenaire."))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id, token]);

  async function handleKyc(userId: string, action: "verify-kyc" | "reject-kyc") {
    setActionLoading(true);
    try {
      await api.patch(`/auth/admin/users/${userId}/${action}`, {}, token!);
      load();
      refreshBadges();
      alertSuccess(action === "verify-kyc" ? "KYC validé." : "KYC rejeté.");
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
    <div className="p-8">
      <button
        onClick={() => router.push("/admin/partenaires")}
        className="mb-4 text-xs font-medium text-gray-500 hover:text-brand-700"
      >
        ← Retour à la liste des partenaires
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{institution.name}</h1>
            {config && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
                {config.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {institution.type ?? "Institution"}
            {institution.bceaoApprovalNumber && ` · Agrément ${institution.bceaoApprovalNumber}`}
            {" · "}Inscrit le {formatAdminDate(institution.createdAt)}
          </p>
        </div>

        {owner && (
          <div className="flex gap-2">
            {owner.kycStatus === "PENDING" && (
              <>
                <button
                  onClick={() => handleKyc(owner.userId, "verify-kyc")}
                  disabled={actionLoading}
                  className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Valider
                </button>
                <button
                  onClick={() => handleKyc(owner.userId, "reject-kyc")}
                  disabled={actionLoading}
                  className="rounded-md border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Rejeter
                </button>
              </>
            )}
            {owner.kycStatus === "VERIFIED" && (
              <button
                onClick={() => handleKyc(owner.userId, "reject-kyc")}
                disabled={actionLoading}
                className="rounded-md border border-orange-200 px-4 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                Suspendre
              </button>
            )}
            {owner.kycStatus === "REJECTED" && (
              <button
                onClick={() => handleKyc(owner.userId, "verify-kyc")}
                disabled={actionLoading}
                className="rounded-md bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Réactiver
              </button>
            )}
          </div>
        )}
      </div>

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
          <p className="text-sm font-semibold text-gray-900">Membres</p>
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
