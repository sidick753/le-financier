"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { NotifBell } from "@/components/ui/notif-bell";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { FundingDocument, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG, formatFileSize } from "@/lib/document-labels";
import { EDITABLE_STATUSES } from "@/lib/funding-status";

// ── config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  DRAFT:        { label: "Brouillon",   badgeClass: "bg-slate-100 text-slate-600" },
  UNDER_REVIEW: { label: "En révision", badgeClass: "bg-amber-50 text-amber-600" },
  PUBLISHED:    { label: "Publié",      badgeClass: "bg-blue-50 text-blue-600" },
  FUNDED:       { label: "Financé",     badgeClass: "bg-green-50 text-green-600" },
  CLOSED:       { label: "Clôturé",     badgeClass: "bg-slate-100 text-slate-500" },
  REJECTED:     { label: "Rejeté",      badgeClass: "bg-red-50 text-red-600" },
  CANCELLED:    { label: "Annulé",      badgeClass: "bg-slate-100 text-slate-500" },
};

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
  currency: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  investorMode: "SINGLE_INVESTOR" | "MULTIPLE_INVESTORS";
  status: string;
  rejectionReason: string | null;
  publishedAt: string | null;
  closesAt: string | null;
  createdAt: string;
  organization: {
    id: string;
    legalName: string;
    sector: string;
  };
  scoringReports?: Array<{
    grade: string | null;
    autoScore: string;
    confidence: string;
  }>;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(v: string | number, currency: string) {
  const n = Number(v);
  if (!n) return "—";
  return `${n.toLocaleString("fr-FR")} ${currency}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DemandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [request, setRequest] = useState<FundingRequestDetail | null>(null);
  const [documents, setDocuments] = useState<FundingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    api
      .get<FundingRequestDetail>(`/funding-requests/${id}`, token)
      .then(setRequest)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement."))
      .finally(() => setIsLoading(false));
    api
      .get<FundingDocument[]>(`/documents/funding-request/${id}`, token)
      .then(setDocuments)
      .catch(() => {});
  }, [token, id]);

  async function handleDelete() {
    if (!token || !id) return;
    if (!window.confirm("Supprimer définitivement cette demande ?")) return;
    setDeleting(true);
    try {
      await api.delete(`/funding-requests/${id}`, token);
      router.push("/dashboard/demandes");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      setDeleting(false);
    }
  }

  const cfg = request ? STATUS_CONFIG[request.status] ?? STATUS_CONFIG.DRAFT : null;
  const report = request?.scoringReports?.[0];
  const editable = request ? EDITABLE_STATUSES.includes(request.status) : false;

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push("/dashboard/demandes")}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <p className="text-[18px] font-semibold tracking-tight text-slate-900">Détail de la demande</p>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <>
              <Link
                href={`/dashboard/demandes/${id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-slate-200 px-3.5 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
                </svg>
                Modifier
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-red-200 px-3.5 text-[13px] font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </>
          )}
          <NotifBell />
        </div>
      </header>

      <div className="mx-auto max-w-3xl p-8 pb-16">
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-[13px] text-slate-400">
            Chargement...
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center">
            <p className="text-[15px] font-medium text-slate-900">Demande introuvable</p>
            <p className="mt-1.5 text-[13px] text-slate-500">{error}</p>
            <Link
              href="/dashboard/demandes"
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-blue-600 px-4 text-[13px] font-medium text-white shadow-[0_6px_16px_rgba(37,99,235,0.22)] transition hover:-translate-y-px hover:bg-blue-700"
            >
              Retour à mes demandes
            </Link>
          </div>
        )}

        {!isLoading && request && cfg && (
          <>
            {/* Header card */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.badgeClass}`}>
                  {cfg.label}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  {CATEGORY_LABELS[request.category] ?? request.category}
                </span>
              </div>
              <h1 className="mb-2 text-[20px] font-semibold text-slate-900">{request.title}</h1>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-600">{request.description}</p>

              {request.status === "REJECTED" && request.rejectionReason && (
                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  <p className="font-semibold">Motif du rejet</p>
                  <p className="mt-0.5">{request.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Key figures */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] text-slate-500">Montant demandé</p>
                <p className="text-[15px] font-semibold text-slate-900">
                  {fmtAmount(request.amountRequested, request.currency)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] text-slate-500">Montant levé</p>
                <p className="text-[15px] font-semibold text-slate-900">
                  {fmtAmount(request.amountRaised, request.currency)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] text-slate-500">Taux proposé</p>
                <p className="text-[15px] font-semibold text-slate-900">
                  {request.expectedReturn ? `${request.expectedReturn} %` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] text-slate-500">Durée</p>
                <p className="text-[15px] font-semibold text-slate-900">
                  {request.durationMonths ? `${request.durationMonths} mois` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] text-slate-500">Mode de financement</p>
                <p className="text-[15px] font-semibold text-slate-900">
                  {request.investorMode === "SINGLE_INVESTOR" ? "Investisseur unique (100%)" : "Plusieurs investisseurs"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] text-slate-500">Publiée le</p>
                <p className="text-[15px] font-semibold text-slate-900">{fmtDate(request.publishedAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] text-slate-500">Créée le</p>
                <p className="text-[15px] font-semibold text-slate-900">{fmtDate(request.createdAt)}</p>
              </div>
            </div>

            {/* Scoring */}
            {report && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-3 text-[14px] font-semibold text-slate-900">Scoring</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="mb-1 text-[11px] text-slate-500">Note</p>
                    <p className="text-[15px] font-semibold text-slate-900">{report.grade ?? "—"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-slate-500">Score auto</p>
                    <p className="text-[15px] font-semibold text-slate-900">{report.autoScore}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-slate-500">Confiance</p>
                    <p className="text-[15px] font-semibold text-slate-900">
                      {Math.round(Number(report.confidence) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-3 text-[14px] font-semibold text-slate-900">
                Documents{documents.length > 0 && ` (${documents.length})`}
              </h2>
              {documents.length === 0 ? (
                <p className="text-[13px] text-slate-400">Aucun document déposé pour cette demande.</p>
              ) : (
                <div className="-mx-6 divide-y divide-slate-100 border-t border-slate-100">
                  {documents.map((doc) => {
                    const dcfg = DOCUMENT_STATUS_CONFIG[doc.status] ?? DOCUMENT_STATUS_CONFIG.PENDING_REVIEW;
                    return (
                      <div key={doc.id} className="flex items-center justify-between gap-3 px-6 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">{doc.fileName}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} · {formatFileSize(doc.sizeBytes)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${dcfg.badgeClass}`}>
                            {dcfg.label}
                          </span>
                          <button
                            onClick={() => setPreviewDocId(doc.id)}
                            className="rounded-[8px] border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Voir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Organization */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-3 text-[14px] font-semibold text-slate-900">Organisation</h2>
              <p className="text-[13px] text-slate-900">{request.organization.legalName}</p>
              <p className="text-[12px] text-slate-500">{request.organization.sector}</p>
            </div>
          </>
        )}
      </div>

      {previewDocId && (
        <DocumentPreviewModal documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}
    </>
  );
}
