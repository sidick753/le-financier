"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { USER_ROLE_CONFIG, KYC_STATUS_CONFIG, formatAdminDate, formatCompactAmount, formatFileSize } from "@/lib/admin-ui";
import { alertError, alertSuccess } from "@/lib/alert";
import { RejectReasonModal } from "@/components/reject-reason-modal";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { NotifBell } from "@/components/ui/notif-bell";

const DOC_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_REVIEW: { label: "À vérifier", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Approuvé", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
};

interface PersonalDocument {
  id: string;
  type: string;
  fileName: string;
  title: string | null;
  sizeBytes: number;
  status: string;
  rejectionReason: string | null;
}

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
  cniNumber: string | null;
  role: string;
  kycStatus: string;
  kycRejectionReason: string | null;
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

  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [docRejectId, setDocRejectId] = useState<string | null>(null);
  const [showKycRejectModal, setShowKycRejectModal] = useState(false);

  function load() {
    if (!token) return;
    if (!user) setIsLoading(true);
    api
      .get<UserDetail>(`/auth/admin/users/${id}`, token)
      .then(setUser)
      .catch(() => setError("Impossible de charger cet investisseur."))
      .finally(() => setIsLoading(false));
  }

  function loadDocuments() {
    if (!token) return;
    api
      .get<PersonalDocument[]>(`/documents/user/${id}`, token)
      .then(setDocuments)
      .catch(() => {});
  }

  useEffect(load, [id, token]);
  useEffect(loadDocuments, [id, token]);

  async function handleApproveDocument(docId: string) {
    setDocActionLoading(docId);
    try {
      await api.patch(`/documents/admin/${docId}/approve`, {}, token!);
      loadDocuments();
      alertSuccess("Document validé.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la validation.");
    } finally {
      setDocActionLoading(null);
    }
  }

  async function handleRejectDocument(reason: string) {
    if (!docRejectId) return;
    setDocActionLoading(docRejectId);
    try {
      await api.patch(`/documents/admin/${docRejectId}/reject`, { reason }, token!);
      setDocRejectId(null);
      loadDocuments();
      alertSuccess("Document rejeté.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du rejet.");
    } finally {
      setDocActionLoading(null);
    }
  }

  async function handleVerifyKyc() {
    setActionLoading(true);
    try {
      await api.patch(`/auth/admin/users/${id}/verify-kyc`, {}, token!);
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
    setActionLoading(true);
    try {
      await api.patch(`/auth/admin/users/${id}/reject-kyc`, { reason }, token!);
      setShowKycRejectModal(false);
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

  if (error || !user) {
    return <div className="p-8 text-sm text-red-500">{error ?? "Investisseur introuvable."}</div>;
  }

  const roleConfig = USER_ROLE_CONFIG[user.role] ?? USER_ROLE_CONFIG.INVESTOR;
  const kycConfig = KYC_STATUS_CONFIG[user.kycStatus] ?? KYC_STATUS_CONFIG.PENDING;
  const totalEngaged = user.investments
    .filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status))
    .reduce((s, i) => s + Number(i.amountCommitted), 0);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.push("/admin/investisseurs")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-black tracking-tight text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleConfig.className}`}>
                {roleConfig.label}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${kycConfig.className}`}>
                {kycConfig.label}
              </span>
            </div>
            <p className="truncate text-xs text-gray-500">
              {user.email} · Inscrit le {formatAdminDate(user.createdAt)}
            </p>
            {user.kycStatus === "REJECTED" && user.kycRejectionReason && (
              <p className="mt-0.5 truncate text-xs text-red-600">Motif : {user.kycRejectionReason}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {user.kycStatus === "PENDING" && (
            <>
              <button
                onClick={handleVerifyKyc}
                disabled={actionLoading}
                className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Valider le KYC
              </button>
              <button
                onClick={() => setShowKycRejectModal(true)}
                disabled={actionLoading}
                className="rounded-md border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Rejeter
              </button>
            </>
          )}
          {user.kycStatus === "REJECTED" && (
            <button
              onClick={handleVerifyKyc}
              disabled={actionLoading}
              className="rounded-md bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              Réactiver
            </button>
          )}
          <NotifBell href="/admin/notifications" />
        </div>
      </header>

      <div className="p-8">
      {/* Infos générales */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <InfoCard label="Téléphone" value={user.phone ?? "—"} />
        <InfoCard label="Numéro de CNI" value={user.cniNumber ?? "—"} />
        <InfoCard label="Investissements actifs" value={String(user.investments.filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status)).length)} />
        <InfoCard label="Total engagé" value={totalEngaged > 0 ? `${formatCompactAmount(totalEngaged)} FCFA` : "—"} />
        <InfoCard label="Statut du compte" value={user.isActive ? "Actif" : "Désactivé"} />
      </div>

      {user.role === "INSTITUTION" && user.institutionMembership && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-2 text-base font-semibold text-gray-900">Institution rattachée</p>
          <p className="text-sm text-gray-700">{user.institutionMembership.institution.name}</p>
          <p className="text-xs text-gray-500">
            {user.institutionMembership.institution.type ?? "—"} · {user.institutionMembership.role}
            {user.institutionMembership.specialty ? ` · ${user.institutionMembership.specialty}` : ""}
          </p>
        </div>
      )}

      {/* Pièces justificatives KYC */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-base font-semibold text-gray-900">Pièces justificatives (KYC)</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Documents déposés par l&apos;investisseur — à consulter avant de valider le KYC.
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {documents.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucun document déposé.</p>
          )}
          {documents.map((doc) => {
            const docConfig = DOC_STATUS_CONFIG[doc.status] ?? DOC_STATUS_CONFIG.PENDING_REVIEW;
            return (
              <div key={doc.id} className="gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{doc.title ?? doc.fileName}</p>
                    <p className="truncate text-xs text-gray-500">
                      {doc.type} · {formatFileSize(doc.sizeBytes)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${docConfig.className}`}>
                      {docConfig.label}
                    </span>
                    <button
                      onClick={() => setPreviewDocId(doc.id)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Voir
                    </button>
                    {doc.status === "PENDING_REVIEW" && (
                      <>
                        <button
                          onClick={() => handleApproveDocument(doc.id)}
                          disabled={docActionLoading === doc.id}
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => setDocRejectId(doc.id)}
                          disabled={docActionLoading === doc.id}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {doc.status === "REJECTED" && doc.rejectionReason && (
                  <p className="mt-2 text-xs text-red-600">Motif : {doc.rejectionReason}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Investissements */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-base font-semibold text-gray-900">Investissements</p>
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

      {previewDocId && (
        <DocumentPreviewModal documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}

      {docRejectId && (
        <RejectReasonModal
          title="Rejeter ce document"
          confirmLabel="Confirmer le rejet"
          isSubmitting={docActionLoading === docRejectId}
          onClose={() => setDocRejectId(null)}
          onConfirm={handleRejectDocument}
        />
      )}

      {showKycRejectModal && (
        <RejectReasonModal
          title="Rejeter le KYC de cet investisseur"
          confirmLabel="Confirmer le rejet"
          isSubmitting={actionLoading}
          onClose={() => setShowKycRejectModal(false)}
          onConfirm={handleRejectKyc}
        />
      )}
      </div>
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
