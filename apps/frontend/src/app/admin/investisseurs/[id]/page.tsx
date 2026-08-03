"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { USER_ROLE_CONFIG, KYC_STATUS_CONFIG, formatAdminDate, formatCompactAmount } from "@/lib/admin-ui";
import { alertError, alertSuccess } from "@/lib/alert";

const INVESTMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  INTERESTED: { label: "Intéressé", className: "bg-gray-100 text-gray-600" },
  NEGOTIATING: { label: "En négociation", className: "bg-yellow-100 text-yellow-700" },
  COMMITTED: { label: "Engagé", className: "bg-green-100 text-green-700" },
  SETTLED_OFF_PLATFORM: { label: "Réglé hors plateforme", className: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Annulé", className: "bg-gray-100 text-gray-500" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
};

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
  investments: Array<{
    id: string;
    amountCommitted: string;
    lockedReturn: string | null;
    status: string;
    createdAt: string;
    fundingRequest: { id: string; title: string; category: string; status: string };
  }>;
  institutionMembership: {
    role: string;
    specialty: string | null;
    status: string;
    institution: { id: string; name: string; type: string | null };
  } | null;
}

export default function AdminInvestisseurDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    if (!token) return;
    setIsLoading(true);
    api
      .get<UserDetail>(`/auth/admin/users/${id}`, token)
      .then(setUser)
      .catch(() => setError("Impossible de charger cet investisseur."))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id, token]);

  async function handleAction(action: "verify-kyc" | "reject-kyc") {
    setActionLoading(true);
    try {
      await api.patch(`/auth/admin/users/${id}/${action}`, {}, token!);
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

  if (error || !user) {
    return <div className="p-8 text-sm text-red-500">{error ?? "Investisseur introuvable."}</div>;
  }

  const roleConfig = USER_ROLE_CONFIG[user.role] ?? USER_ROLE_CONFIG.INVESTOR;
  const kycConfig = KYC_STATUS_CONFIG[user.kycStatus] ?? KYC_STATUS_CONFIG.PENDING;
  const totalEngaged = user.investments
    .filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status))
    .reduce((s, i) => s + Number(i.amountCommitted), 0);

  return (
    <div className="p-8">
      <button
        onClick={() => router.push("/admin/investisseurs")}
        className="mb-4 text-xs font-medium text-gray-500 hover:text-brand-700"
      >
        ← Retour à la liste des investisseurs
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleConfig.className}`}>
              {roleConfig.label}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${kycConfig.className}`}>
              {kycConfig.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {user.email} · Inscrit le {formatAdminDate(user.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          {user.kycStatus === "PENDING" && (
            <>
              <button
                onClick={() => handleAction("verify-kyc")}
                disabled={actionLoading}
                className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Valider le KYC
              </button>
              <button
                onClick={() => handleAction("reject-kyc")}
                disabled={actionLoading}
                className="rounded-md border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Rejeter
              </button>
            </>
          )}
          {user.kycStatus === "REJECTED" && (
            <button
              onClick={() => handleAction("verify-kyc")}
              disabled={actionLoading}
              className="rounded-md bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              Réactiver
            </button>
          )}
        </div>
      </div>

      {/* Infos générales */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <InfoCard label="Téléphone" value={user.phone ?? "—"} />
        <InfoCard label="Investissements actifs" value={String(user.investments.filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status)).length)} />
        <InfoCard label="Total engagé" value={totalEngaged > 0 ? `${formatCompactAmount(totalEngaged)} FCFA` : "—"} />
        <InfoCard label="Statut du compte" value={user.isActive ? "Actif" : "Désactivé"} />
      </div>

      {user.role === "INSTITUTION" && user.institutionMembership && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-2 text-sm font-semibold text-gray-900">Institution rattachée</p>
          <p className="text-sm text-gray-700">{user.institutionMembership.institution.name}</p>
          <p className="text-xs text-gray-500">
            {user.institutionMembership.institution.type ?? "—"} · {user.institutionMembership.role}
            {user.institutionMembership.specialty ? ` · ${user.institutionMembership.specialty}` : ""}
          </p>
        </div>
      )}

      {/* Investissements */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Investissements</p>
        </div>
        <div className="divide-y divide-gray-100">
          {user.investments.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucun investissement.</p>
          )}
          {user.investments.map((inv) => {
            const invConfig = INVESTMENT_STATUS_CONFIG[inv.status] ?? INVESTMENT_STATUS_CONFIG.INTERESTED;
            return (
              <Link
                key={inv.id}
                href={`/admin/opportunites/${inv.fundingRequest.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.fundingRequest.title}</p>
                  <p className="text-xs text-gray-500">
                    {inv.fundingRequest.category} · {formatAdminDate(inv.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCompactAmount(Number(inv.amountCommitted))} FCFA
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${invConfig.className}`}>
                    {invConfig.label}
                  </span>
                </div>
              </Link>
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
