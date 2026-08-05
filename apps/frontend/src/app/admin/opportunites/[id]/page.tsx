"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { RejectReasonModal } from "@/components/reject-reason-modal";
import { ApproveClaimModal } from "@/components/approve-claim-modal";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { ScoringSnapshotModal } from "@/components/scoring-snapshot-modal";
import { FUNDING_STATUS_CONFIG, CLAIM_STATUS_CONFIG, ORG_STATUS_CONFIG, formatAdminDate, formatFullAmount, formatFileSize } from "@/lib/admin-ui";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG } from "@/lib/document-labels";
import { alertError, alertSuccess, confirmDialog } from "@/lib/alert";
import { OrganizationProfileSummary, type OrganizationProfileSummaryData } from "@/components/organization-profile-summary";
import { NotifBell } from "@/components/ui/notif-bell";

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Affacturage",
  PRET: "Prêt MLT",
  EQUITY: "Equity",
};

const INVESTMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  INTERESTED: { label: "Intéressé", className: "bg-gray-100 text-gray-600" },
  NEGOTIATING: { label: "En négociation", className: "bg-yellow-100 text-yellow-700" },
  COMMITTED: { label: "Engagé", className: "bg-blue-100 text-blue-700" },
  SETTLEMENT_SUBMITTED: { label: "Preuve à valider", className: "bg-amber-100 text-amber-700" },
  SETTLED_OFF_PLATFORM: { label: "Virement validé", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Annulé", className: "bg-gray-100 text-gray-500" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
};

interface PayoutClaimRow {
  id: string;
  amountRequested: string;
  amountNet: string | null;
  status: "REQUESTED" | "PAID" | "REJECTED";
  requestedAt: string;
  rejectionReason: string | null;
  requestedBy: { firstName: string; lastName: string };
}

interface InvestmentRow {
  id: string;
  amountCommitted: string;
  lockedReturn: string | null;
  status: string;
  settlementProofId: string | null;
  settlementRejectionReason: string | null;
  createdAt: string;
  investor: { id: string; firstName: string; lastName: string; email: string };
}

interface FundingRequestDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  investorMode: "SINGLE_INVESTOR" | "MULTIPLE_INVESTORS";
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  disbursedAt: string | null;
  disbursedAmount: string | null;
  organization: {
    id: string;
    legalName: string;
    registrationNumber: string;
    sector: string;
    verificationStatus: string;
    members: Array<{
      id: string;
      role: string;
      user: { firstName: string; lastName: string; email: string; phone: string | null };
    }>;
  } & OrganizationProfileSummaryData;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    sizeBytes: number;
    status: string;
    rejectionReason: string | null;
  }>;
  scoringReports: Array<{
    id: string;
    grade: string | null;
    autoScore: string;
    confidence: string;
  }>;
  investments: InvestmentRow[];
  payoutClaims: PayoutClaimRow[];
}

export default function AdminOpportuniteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();

  const [fr, setFr] = useState<FundingRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [snapshotReportId, setSnapshotReportId] = useState<string | null>(null);
  const [settlementActionId, setSettlementActionId] = useState<string | null>(null);
  const [rejectSettlementFor, setRejectSettlementFor] = useState<string | null>(null);
  const [claimActionId, setClaimActionId] = useState<string | null>(null);
  const [rejectClaimFor, setRejectClaimFor] = useState<string | null>(null);
  const [approveClaimFor, setApproveClaimFor] = useState<string | null>(null);
  const [docActionId, setDocActionId] = useState<string | null>(null);
  const [rejectDocFor, setRejectDocFor] = useState<string | null>(null);

  function load() {
    if (!token) return;
    if (!fr) setIsLoading(true);
    api
      .get<FundingRequestDetail>(`/funding-requests/admin/${id}`, token)
      .then(setFr)
      .catch(() => setError("Impossible de charger cette opportunité."))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id, token]);

  async function handleApprove() {
    if (!(await confirmDialog("Approuver cette opportunité ? Elle deviendra visible par les investisseurs.", { confirmText: "Approuver", danger: false }))) return;
    setActionLoading(true);
    try {
      await api.patch(`/funding-requests/${id}/approve`, {}, token!);
      load();
      refreshBadges();
      alertSuccess("Opportunité approuvée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de l'approbation.");
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
      refreshBadges();
      alertSuccess("Opportunité rejetée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du rejet.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!(await confirmDialog("Suspendre cette opportunité ? Elle ne sera plus visible par les investisseurs.", { confirmText: "Suspendre" }))) return;
    setActionLoading(true);
    try {
      await api.patch(`/funding-requests/${id}/cancel`, {}, token!);
      load();
      refreshBadges();
      alertSuccess("Opportunité suspendue.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la suspension.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivate() {
    if (!(await confirmDialog("Réactiver cette opportunité ? Elle redeviendra visible par les investisseurs.", { confirmText: "Réactiver", danger: false }))) return;
    setActionLoading(true);
    try {
      await api.patch(`/funding-requests/${id}/reactivate`, {}, token!);
      load();
      refreshBadges();
      alertSuccess("Opportunité réactivée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la réactivation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveClaim(proofDocumentId: string, paidAt: string) {
    if (!approveClaimFor) return;
    setClaimActionId(approveClaimFor);
    try {
      await api.patch(`/funding-requests/claims/${approveClaimFor}/approve`, { proofDocumentId, paidAt }, token!);
      setApproveClaimFor(null);
      load();
      refreshBadges();
      alertSuccess("Réclamation validée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la validation.");
    } finally {
      setClaimActionId(null);
    }
  }

  async function handleRejectClaim(reason: string) {
    if (!rejectClaimFor) return;
    setClaimActionId(rejectClaimFor);
    try {
      await api.patch(`/funding-requests/claims/${rejectClaimFor}/reject`, { reason }, token!);
      setRejectClaimFor(null);
      load();
      refreshBadges();
      alertSuccess("Réclamation rejetée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du rejet.");
    } finally {
      setClaimActionId(null);
    }
  }

  async function handleApproveDoc(docId: string) {
    if (!(await confirmDialog("Valider ce document ?", { confirmText: "Valider", danger: false }))) return;
    setDocActionId(docId);
    try {
      await api.patch(`/documents/admin/${docId}/approve`, {}, token!);
      load();
      alertSuccess("Document validé.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la validation.");
    } finally {
      setDocActionId(null);
    }
  }

  async function handleRejectDoc(reason: string) {
    if (!rejectDocFor) return;
    setDocActionId(rejectDocFor);
    try {
      await api.patch(`/documents/admin/${rejectDocFor}/reject`, { reason }, token!);
      setRejectDocFor(null);
      load();
      alertSuccess("Document rejeté.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du rejet.");
    } finally {
      setDocActionId(null);
    }
  }

  async function handleApproveSettlement(investmentId: string) {
    if (!(await confirmDialog("Valider ce virement ? L'engagement sera confirmé et l'échéancier généré.", { confirmText: "Valider", danger: false }))) return;
    setSettlementActionId(investmentId);
    try {
      await api.patch(`/investments/${investmentId}/settlement/approve`, {}, token!);
      load();
      alertSuccess("Preuve de virement validée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la validation.");
    } finally {
      setSettlementActionId(null);
    }
  }

  async function handleRejectSettlement(reason: string) {
    if (!rejectSettlementFor) return;
    setSettlementActionId(rejectSettlementFor);
    try {
      await api.patch(`/investments/${rejectSettlementFor}/settlement/reject`, { reason }, token!);
      setRejectSettlementFor(null);
      load();
      alertSuccess("Preuve de virement rejetée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du rejet.");
    } finally {
      setSettlementActionId(null);
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
  const hasBankInfo = fr.organization.bankAccountNumber;
  const settledCount = fr.investments.filter((inv) => inv.status === "SETTLED_OFF_PLATFORM").length;
  const pendingSettlementCount = fr.investments.filter((inv) => inv.status === "SETTLEMENT_SUBMITTED").length;
  const committedCount = fr.investments.filter((inv) => inv.status === "COMMITTED").length;
  const orgOwner = fr.organization.members.find((m) => m.role === "OWNER") ?? fr.organization.members[0];

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.push("/admin/opportunites")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-black tracking-tight text-gray-900">{fr.title}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}>
                {config.label}
              </span>
            </div>
            <p className="truncate text-xs text-gray-500">
              <Link href={`/admin/pme/${fr.organization.id}`} className="hover:text-brand-700 hover:underline">
                {fr.organization.legalName}
              </Link>
              {" · "}
              {CATEGORY_LABELS[fr.category] ?? fr.category} · Soumise le {formatAdminDate(fr.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {fr.status === "UNDER_REVIEW" && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading || fr.organization.verificationStatus !== "VERIFIED"}
                title={
                  fr.organization.verificationStatus !== "VERIFIED"
                    ? "L'organisation doit d'abord être vérifiée (KYC) avant de publier cette demande."
                    : undefined
                }
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
          {fr.status === "CANCELLED" && (
            <button
              onClick={handleReactivate}
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
      {fr.rejectionReason && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">Motif du rejet</p>
          <p className="mt-1 text-sm text-red-600">{fr.rejectionReason}</p>
        </div>
      )}

      {fr.status === "FUNDED" && (
        <div className="mb-6 rounded-xl border border-purple-100 bg-purple-50 p-4">
          <p className="text-xs font-semibold text-purple-700">100% financé</p>
          <p className="mt-1 text-sm text-purple-600">
            Tous les virements requis ont été validés ({formatFullAmount(raised)}). La PME peut désormais
            réclamer les fonds (en une ou plusieurs fois) depuis son tableau de bord — retrouvez ses
            réclamations ci-dessous à valider{" "}
            {hasBankInfo
              ? `pour versement sur le compte ${fr.organization.bankName ?? ""} de ${fr.organization.bankAccountHolder ?? fr.organization.legalName}.`
              : "— aucune information bancaire renseignée par la PME."}
          </p>
        </div>
      )}

      {fr.disbursedAt && Number(fr.disbursedAmount) > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-700">
            {fr.status === "CLOSED" ? "Intégralement réclamée" : "Décaissement partiel"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {formatFullAmount(Number(fr.disbursedAmount))} versés à la PME (dernière réclamation le{" "}
            {formatAdminDate(fr.disbursedAt)}, commission de 2% déduite du montant levé de {formatFullAmount(raised)}).
          </p>
        </div>
      )}


      {/* Stats */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <InfoCard label="Montant demandé" value={formatFullAmount(requested)} />
        <InfoCard label="Montant levé" value={`${formatFullAmount(raised)} (${progress.toFixed(0)}%)`} />
        <InfoCard label="Rendement proposé" value={fr.expectedReturn ? `${Number(fr.expectedReturn)}%` : "—"} />
        <InfoCard label="Durée" value={fr.durationMonths ? `${fr.durationMonths} mois` : "—"} />
        <InfoCard
          label="Mode de financement"
          value={fr.investorMode === "SINGLE_INVESTOR" ? "Investisseur unique (100%)" : "Plusieurs investisseurs"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Description */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-2 text-lg font-bold text-gray-900">Description</p>
          <p className="text-sm leading-relaxed text-gray-600">{fr.description}</p>
        </div>

        {/* Scoring */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">Scoring</p>
            {report && (
              <button
                onClick={() => setSnapshotReportId(report.id)}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Voir le détail (DSCR, garantie...)
              </button>
            )}
          </div>
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

            {/* Investissements — priorité haute : c'est ici que l'admin valide/rejette les
          preuves de virement, l'action la plus fréquente et la plus urgente sur cette page.
          Mis en évidence dès qu'un engagement existe, avec un rappel du montant validé/% du
          montant demandé et une barre de progression (même donnée que la carte "Montant levé"
          ci-dessus, mais au plus près du détail par investisseur). */}
      <div className={`mb-4 rounded-xl border bg-white ${fr.investments.length > 0 ? "border-l-4 border-l-blue-500 border-gray-200" : "border-gray-200"}`}>
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">Investissements</p>
            <div className="flex items-center gap-1.5">
              {settledCount > 0 && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  {settledCount} virement{settledCount > 1 ? "s" : ""} confirmé{settledCount > 1 ? "s" : ""}
                </span>
              )}
              {pendingSettlementCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {pendingSettlementCount} preuve{pendingSettlementCount > 1 ? "s" : ""} à valider
                </span>
              )}
              {committedCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {committedCount} en attente de virement
                </span>
              )}
            </div>
          </div>
          {fr.investorMode === "SINGLE_INVESTOR" && (
            <p className="mt-0.5 text-xs text-amber-600">
              Investisseur unique attendu — un seul engagement à 100% du montant est accepté sur ce dossier.
            </p>
          )}
          {fr.investments.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">
                  {formatFullAmount(raised)} validés{" "}
                  <span className="text-gray-400">
                    ({requested > 0 ? Math.round((raised / requested) * 100) : 0}% du montant demandé)
                  </span>
                </span>
                <span className="text-gray-400">Reste {formatFullAmount(Math.max(0, requested - raised))}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {fr.investments.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucun engagement pour l'instant.</p>
          )}
          {fr.investments.map((inv) => {
            const invConfig = INVESTMENT_STATUS_CONFIG[inv.status] ?? INVESTMENT_STATUS_CONFIG.INTERESTED;
            const isPending = settlementActionId === inv.id;
            return (
              <div key={inv.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {inv.investor.firstName} {inv.investor.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFullAmount(Number(inv.amountCommitted))}
                    {inv.lockedReturn ? ` · ${Number(inv.lockedReturn)}%` : ""} · {inv.investor.email}
                  </p>
                  {inv.status === "COMMITTED" && inv.settlementRejectionReason && (
                    <p className="mt-1 text-xs text-red-600">
                      Preuve précédente rejetée : {inv.settlementRejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {inv.settlementProofId && (
                    <button
                      onClick={() => setPreviewDocId(inv.settlementProofId)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Voir la preuve
                    </button>
                  )}
                  {inv.status === "SETTLEMENT_SUBMITTED" && (
                    <>
                      <button
                        onClick={() => handleApproveSettlement(inv.id)}
                        disabled={isPending}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => setRejectSettlementFor(inv.id)}
                        disabled={isPending}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${invConfig.className}`}>
                    {invConfig.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Réclamations de la PME */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-lg font-bold text-gray-900">Réclamations</p>
          <p className="mt-0.5 text-xs text-gray-500">
            La PME peut réclamer les fonds déjà validés à tout moment, même avant 100% financé.
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {fr.payoutClaims.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucune réclamation pour l'instant.</p>
          )}
          {fr.payoutClaims.map((claim) => {
            const claimConfig = CLAIM_STATUS_CONFIG[claim.status] ?? CLAIM_STATUS_CONFIG.REQUESTED;
            const isPending = claimActionId === claim.id;
            return (
              <div key={claim.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatFullAmount(Number(claim.amountRequested))}
                    {claim.amountNet
                      ? ` · net ${formatFullAmount(Number(claim.amountNet))} (commission 2%)`
                      : " (commission 2% au versement)"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Réclamé par {claim.requestedBy.firstName} {claim.requestedBy.lastName} le{" "}
                    {formatAdminDate(claim.requestedAt)}
                  </p>
                  {claim.status === "REJECTED" && claim.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">Motif : {claim.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {claim.status === "REQUESTED" && (
                    <>
                      <button
                        onClick={() => setApproveClaimFor(claim.id)}
                        disabled={isPending}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => setRejectClaimFor(claim.id)}
                        disabled={isPending}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${claimConfig.className}`}>
                    {claimConfig.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Profil de la PME — toutes les infos nécessaires pour approuver en connaissance de
          cause, sans quitter la page (identité, coordonnées bancaires, profil de crédit). */}
      <div className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-gray-900">Profil de la PME</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${(ORG_STATUS_CONFIG[fr.organization.verificationStatus] ?? ORG_STATUS_CONFIG.PENDING).className}`}>
              {(ORG_STATUS_CONFIG[fr.organization.verificationStatus] ?? ORG_STATUS_CONFIG.PENDING).label}
            </span>
          </div>
          <Link
            href={`/admin/pme/${fr.organization.id}`}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Voir la fiche PME complète →
          </Link>
        </div>
        <OrganizationProfileSummary org={fr.organization} owner={orgOwner?.user ?? null} />
      </div>

      {/* Documents — dossier déposé par la PME (états financiers, statuts, pièces jointes).
          Les preuves de virement (SETTLEMENT_PROOF) sont déposées par l'investisseur et déjà
          visibles avec leur propre décision dans la section Investissements ci-dessus : pas
          de doublon ici. */}
      {/* <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-lg font-bold text-gray-900">Documents de la PME</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Pièces déposées par la PME pour ce dossier — validez ou rejetez celles encore en revue.
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {fr.documents.filter((doc) => doc.type !== "SETTLEMENT_PROOF").length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucun document déposé.</p>
          )}
          {fr.documents.filter((doc) => doc.type !== "SETTLEMENT_PROOF").map((doc) => {
            const docStatus = DOCUMENT_STATUS_CONFIG[doc.status] ?? DOCUMENT_STATUS_CONFIG.PENDING_REVIEW;
            const isPending = docActionId === doc.id;
            return (
              <div key={doc.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} · {formatFileSize(doc.sizeBytes)}
                  </p>
                  {doc.status === "REJECTED" && doc.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">Motif : {doc.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDocId(doc.id)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Voir
                  </button>
                  {doc.status === "PENDING_REVIEW" && (
                    <>
                      <button
                        onClick={() => handleApproveDoc(doc.id)}
                        disabled={isPending}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => setRejectDocFor(doc.id)}
                        disabled={isPending}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${docStatus.badgeClass}`}>
                    {docStatus.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div> */}

      {showRejectModal && (
        <RejectReasonModal
          title="Rejeter cette opportunité"
          confirmLabel="Confirmer le rejet"
          isSubmitting={actionLoading}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
        />
      )}

      {rejectSettlementFor && (
        <RejectReasonModal
          title="Rejeter la preuve de virement"
          confirmLabel="Confirmer le rejet"
          description="Ce motif sera communiqué à l'investisseur, qui pourra soumettre une nouvelle preuve."
          isSubmitting={settlementActionId === rejectSettlementFor}
          onClose={() => setRejectSettlementFor(null)}
          onConfirm={handleRejectSettlement}
        />
      )}

      {rejectClaimFor && (
        <RejectReasonModal
          title="Rejeter cette réclamation"
          confirmLabel="Confirmer le rejet"
          isSubmitting={claimActionId === rejectClaimFor}
          onClose={() => setRejectClaimFor(null)}
          onConfirm={handleRejectClaim}
        />
      )}

      {approveClaimFor && (
        <ApproveClaimModal
          title="Valider cette réclamation"
          fundingRequestId={id}
          isSubmitting={claimActionId === approveClaimFor}
          onClose={() => setApproveClaimFor(null)}
          onConfirm={handleApproveClaim}
        />
      )}

      {rejectDocFor && (
        <RejectReasonModal
          title="Rejeter ce document"
          confirmLabel="Confirmer le rejet"
          description="Ce motif sera communiqué à la PME, qui pourra déposer un nouveau document."
          isSubmitting={docActionId === rejectDocFor}
          onClose={() => setRejectDocFor(null)}
          onConfirm={handleRejectDoc}
        />
      )}

      {previewDocId && (
        <DocumentPreviewModal documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}

      {snapshotReportId && (
        <ScoringSnapshotModal reportId={snapshotReportId} onClose={() => setSnapshotReportId(null)} />
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
