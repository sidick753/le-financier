"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { RejectReasonModal } from "@/components/reject-reason-modal";
import { FUNDING_STATUS_CONFIG, formatAdminDate, formatFullAmount, formatFileSize } from "@/lib/admin-ui";

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt MLT",
  EQUITY: "Equity",
};

interface FundingRequestDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  organization: {
    id: string;
    legalName: string;
    registrationNumber: string;
    sector: string;
    verificationStatus: string;
  };
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    sizeBytes: number;
    status: string;
  }>;
  scoringReports: Array<{
    id: string;
    grade: string | null;
    autoScore: string;
    confidence: string;
  }>;
}

export default function AdminOpportuniteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [fr, setFr] = useState<FundingRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  function load() {
    if (!token) return;
    setIsLoading(true);
    api
      .get<FundingRequestDetail>(`/funding-requests/admin/${id}`, token)
      .then(setFr)
      .catch(() => setError("Impossible de charger cette opportunité."))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id, token]);

  async function handleApprove() {
    setActionLoading(true);
    try {
      await api.patch(`/funding-requests/${id}/approve`, {}, token!);
      load();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(reason: string) {
    setActionLoading(true);
    try {
      await api.patch(`/funding-requests/${id}/reject`, { reason }, token!);
      setShowRejectModal(false);
      load();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      await api.patch(`/funding-requests/${id}/cancel`, {}, token!);
      load();
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-400">Chargement...</div>;
  }

  if (error || !fr) {
    return <div className="p-8 text-sm text-red-500">{error ?? "Opportunité introuvable."}</div>;
  }

  const config = FUNDING_STATUS_CONFIG[fr.status] ?? FUNDING_STATUS_CONFIG.DRAFT;
  const requested = Number(fr.amountRequested);
  const raised = Number(fr.amountRaised);
  const progress = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;
  const report = fr.scoringReports?.[0] ?? null;

  return (
    <div className="p-8">
      <button
        onClick={() => router.push("/admin/opportunites")}
        className="mb-4 text-xs font-medium text-gray-500 hover:text-brand-700"
      >
        ← Retour à la liste des opportunités
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{fr.title}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            <Link href={`/admin/pme/${fr.organization.id}`} className="hover:text-brand-700 hover:underline">
              {fr.organization.legalName}
            </Link>
            {" · "}
            {CATEGORY_LABELS[fr.category] ?? fr.category} · Soumise le {formatAdminDate(fr.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          {fr.status === "UNDER_REVIEW" && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approuver
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="rounded-md border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Rejeter
              </button>
            </>
          )}
          {["PUBLISHED", "FUNDED"].includes(fr.status) && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="rounded-md border border-orange-200 px-4 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            >
              Suspendre
            </button>
          )}
        </div>
      </div>

      {fr.rejectionReason && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">Motif du rejet</p>
          <p className="mt-1 text-sm text-red-600">{fr.rejectionReason}</p>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <InfoCard label="Montant demandé" value={formatFullAmount(requested)} />
        <InfoCard label="Montant levé" value={`${formatFullAmount(raised)} (${progress.toFixed(0)}%)`} />
        <InfoCard label="Rendement proposé" value={fr.expectedReturn ? `${Number(fr.expectedReturn)}%` : "—"} />
        <InfoCard label="Durée" value={fr.durationMonths ? `${fr.durationMonths} mois` : "—"} />
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Description */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-2 text-sm font-semibold text-gray-900">Description</p>
          <p className="text-sm leading-relaxed text-gray-600">{fr.description}</p>
        </div>

        {/* Scoring */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-2 text-sm font-semibold text-gray-900">Scoring</p>
          {report ? (
            <div className="flex items-center gap-4">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(Number(report.autoScore))}/100
              </p>
              {report.grade && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                  {report.grade}
                </span>
              )}
              <p className="text-xs text-gray-400">
                Confiance {Math.round(Number(report.confidence) * 100)}%
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Pas encore calculé.</p>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Documents</p>
        </div>
        <div className="divide-y divide-gray-100">
          {fr.documents.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucun document déposé.</p>
          )}
          {fr.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                <p className="text-xs text-gray-500">
                  {doc.type} · {formatFileSize(doc.sizeBytes)}
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showRejectModal && (
        <RejectReasonModal
          title="Rejeter cette opportunité"
          confirmLabel="Confirmer le rejet"
          isSubmitting={actionLoading}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
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
