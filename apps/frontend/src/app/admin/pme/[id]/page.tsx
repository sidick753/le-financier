"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { RejectReasonModal } from "@/components/reject-reason-modal";
import { ORG_STATUS_CONFIG, formatAdminDate, formatCompactAmount, formatFileSize } from "@/lib/admin-ui";
import { useAdminBadges } from "@/lib/admin-badges-context";

const DOC_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_REVIEW: { label: "À vérifier", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Approuvé", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
};

interface OrganizationDetail {
  id: string;
  legalName: string;
  registrationNumber: string;
  sector: string;
  foundedYear: number | null;
  legalForm: string | null;
  address: string | null;
  city: string | null;
  country: string;
  verificationStatus: string;
  rejectionReason: string | null;
  createdAt: string;
  members: Array<{
    id: string;
    role: string;
    user: { firstName: string; lastName: string; email: string };
  }>;
  fundingRequests: Array<{
    id: string;
    title: string;
    category: string;
    amountRequested: string;
    amountRaised: string;
    status: string;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    sizeBytes: number;
    status: string;
    createdAt: string;
  }>;
  scoringReports: Array<{
    id: string;
    product: string;
    grade: string | null;
    autoScore: string;
    createdAt: string;
  }>;
}

export default function AdminPmeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<"reject" | "suspend" | null>(null);

  function load() {
    if (!token) return;
    setIsLoading(true);
    api
      .get<OrganizationDetail>(`/organizations/admin/${id}`, token)
      .then(setOrg)
      .catch(() => setError("Impossible de charger cette PME."))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id, token]);

  async function handleVerify() {
    setActionLoading(true);
    try {
      await api.patch(`/organizations/admin/${id}/verify`, {}, token!);
      load();
      refreshBadges();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(reason: string) {
    setActionLoading(true);
    try {
      await api.patch(`/organizations/admin/${id}/reject`, { reason }, token!);
      setModal(null);
      load();
      refreshBadges();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspend(reason: string) {
    setActionLoading(true);
    try {
      await api.patch(`/organizations/admin/${id}/suspend`, { reason }, token!);
      setModal(null);
      load();
      refreshBadges();
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-400">Chargement...</div>;
  }

  if (error || !org) {
    return <div className="p-8 text-sm text-red-500">{error ?? "PME introuvable."}</div>;
  }

  const config = ORG_STATUS_CONFIG[org.verificationStatus] ?? ORG_STATUS_CONFIG.PENDING;
  const owner = org.members.find((m) => m.role === "OWNER") ?? org.members[0];

  return (
    <div className="p-8">
      <button
        onClick={() => router.push("/admin/pme")}
        className="mb-4 text-xs font-medium text-gray-500 hover:text-brand-700"
      >
        ← Retour à la liste des PME
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{org.legalName}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            RCCM {org.registrationNumber} · {org.sector} · Inscrite le {formatAdminDate(org.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          {org.verificationStatus === "PENDING" && (
            <>
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Valider le KYC
              </button>
              <button
                onClick={() => setModal("reject")}
                disabled={actionLoading}
                className="rounded-md border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Rejeter
              </button>
            </>
          )}
          {org.verificationStatus === "VERIFIED" && (
            <button
              onClick={() => setModal("suspend")}
              disabled={actionLoading}
              className="rounded-md border border-orange-200 px-4 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            >
              Suspendre
            </button>
          )}
          {org.verificationStatus === "REJECTED" && (
            <button
              onClick={handleVerify}
              disabled={actionLoading}
              className="rounded-md bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              Réactiver
            </button>
          )}
        </div>
      </div>

      {org.rejectionReason && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">Motif du rejet / de la suspension</p>
          <p className="mt-1 text-sm text-red-600">{org.rejectionReason}</p>
        </div>
      )}

      {/* Infos générales */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <InfoCard label="Forme juridique" value={org.legalForm ?? "—"} />
        <InfoCard label="Année de création" value={org.foundedYear?.toString() ?? "—"} />
        <InfoCard label="Ville" value={org.city ?? "—"} />
        <InfoCard label="Adresse" value={org.address ?? "—"} />
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Membres */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-900">Membres</p>
          </div>
          <div className="divide-y divide-gray-100">
            {org.members.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Aucun membre.</p>
            )}
            {org.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {m.user.firstName} {m.user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{m.user.email}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {m.role === "OWNER" ? "Propriétaire" : "Membre"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-900">Documents</p>
          </div>
          <div className="divide-y divide-gray-100">
            {org.documents.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Aucun document déposé.</p>
            )}
            {org.documents.map((doc) => {
              const docConfig = DOC_STATUS_CONFIG[doc.status] ?? DOC_STATUS_CONFIG.PENDING_REVIEW;
              return (
                <div key={doc.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {doc.type} · {formatFileSize(doc.sizeBytes)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${docConfig.className}`}>
                    {docConfig.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Demandes de financement */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Demandes de financement</p>
        </div>
        <div className="divide-y divide-gray-100">
          {org.fundingRequests.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucune demande de financement.</p>
          )}
          {org.fundingRequests.map((fr) => (
            <Link
              key={fr.id}
              href={`/admin/opportunites/${fr.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{fr.title}</p>
                <p className="text-xs text-gray-500">
                  {fr.category} · {formatAdminDate(fr.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatCompactAmount(Number(fr.amountRequested))} FCFA
                </p>
                <p className="text-xs text-gray-500">{fr.status}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {modal === "reject" && (
        <RejectReasonModal
          title="Rejeter cette PME"
          confirmLabel="Confirmer le rejet"
          isSubmitting={actionLoading}
          onClose={() => setModal(null)}
          onConfirm={handleReject}
        />
      )}
      {modal === "suspend" && (
        <RejectReasonModal
          title="Suspendre cette PME"
          confirmLabel="Confirmer la suspension"
          isSubmitting={actionLoading}
          onClose={() => setModal(null)}
          onConfirm={handleSuspend}
        />
      )}
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
