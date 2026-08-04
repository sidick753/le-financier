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
import { CLAIM_STATUS_CONFIG, INVESTMENT_STATUS_CONFIG } from "@/lib/admin-ui";
import { alertError, alertSuccess, confirmDialog } from "@/lib/alert";
import { FieldError } from "@/components/ui/field-error";
import { PmeRepaymentSchedule } from "@/components/pme-repayment-schedule";

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

interface PayoutClaimRow {
  id: string;
  amountRequested: string;
  amountNet: string | null;
  status: "REQUESTED" | "PAID" | "REJECTED";
  requestedAt: string;
  rejectionReason: string | null;
}

// Sous-ensemble de /investments/organization/:organizationId (voir useOffers) —
// on filtre côté client sur cette demande précise, endpoint déjà réservé aux
// membres de l'organisation (isMember), donc sûr à réutiliser tel quel ici.
interface InvestorRow {
  id: string;
  amountCommitted: string;
  lockedReturn: string | null;
  status: string;
  createdAt: string;
  fundingRequest: { id: string };
  investor: { firstName: string; lastName: string; email: string };
}

// Un engagement compte comme "investissement réel" (et entre dans le range de
// tickets) une fois confirmé — avant ça (INTERESTED/NEGOTIATING), ce n'est
// qu'une proposition qui peut encore changer de montant.
const COMMITTED_STATUSES = ["COMMITTED", "SETTLEMENT_SUBMITTED", "SETTLED_OFF_PLATFORM"];

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
  disbursedAt: string | null;
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
  const [claimable, setClaimable] = useState<number | null>(null);
  const [claims, setClaims] = useState<PayoutClaimRow[]>([]);
  const [claimPercent, setClaimPercent] = useState("");
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimAmountError, setClaimAmountError] = useState<string | null>(null);
  const [investors, setInvestors] = useState<InvestorRow[]>([]);

  function loadClaims() {
    if (!token || !id) return;
    api.get<number>(`/funding-requests/${id}/claimable`, token).then(setClaimable).catch(() => {});
    api.get<PayoutClaimRow[]>(`/funding-requests/${id}/claims`, token).then(setClaims).catch(() => {});
  }

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
    loadClaims();
  }, [token, id]);

  // Nécessite l'organisation (connue une fois `request` chargé) — endpoint
  // organisation entière, filtré côté client sur cette demande précise.
  useEffect(() => {
    if (!token || !request) return;
    api
      .get<InvestorRow[]>(`/investments/organization/${request.organization.id}`, token)
      .then((all) => setInvestors(all.filter((inv) => inv.fundingRequest.id === id)))
      .catch(() => {});
  }, [token, request, id]);

  async function handleRequestClaim() {
    if (!token || !id) return;
    // Laisser vide = réclamer tout le disponible (100%), toujours autorisé. Un
    // pourcentage saisi doit rester entre 10 et 100 — en dessous, ça fait autant
    // de réclamations à valider par un admin pour presque rien.
    let amount: number | undefined;
    if (claimPercent.trim() && claimable !== null) {
      const pct = Number(claimPercent);
      if (!Number.isFinite(pct) || pct < 10 || pct > 100) {
        setClaimAmountError("Entre 10% et 100% du disponible.");
        return;
      }
      amount = Math.round(claimable * (pct / 100));
    }
    setClaimAmountError(null);
    setClaimSubmitting(true);
    try {
      await api.post(`/funding-requests/${id}/claims`, { amount }, token);
      setClaimPercent("");
      loadClaims();
      alertSuccess("Réclamation envoyée, elle est en attente de validation par un admin.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors de la réclamation.");
    } finally {
      setClaimSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!token || !id) return;
    if (!(await confirmDialog("Supprimer définitivement cette demande ?", { confirmText: "Supprimer" }))) return;
    setDeleting(true);
    try {
      await api.delete(`/funding-requests/${id}`, token);
      router.push("/dashboard/demandes");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      setDeleting(false);
    }
  }

  const cfg = request ? STATUS_CONFIG[request.status] ?? STATUS_CONFIG.DRAFT : null;
  const report = request?.scoringReports?.[0];
  const editable = request ? EDITABLE_STATUSES.includes(request.status) : false;
  const requested = request ? Number(request.amountRequested) : 0;
  const raised = request ? Number(request.amountRaised) : 0;
  const progress = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;
  const committedInvestors = investors.filter((inv) => COMMITTED_STATUSES.includes(inv.status));
  const ticketAmounts = committedInvestors.map((inv) => Number(inv.amountCommitted));
  const minTicket = ticketAmounts.length > 0 ? Math.min(...ticketAmounts) : null;
  const maxTicket = ticketAmounts.length > 0 ? Math.max(...ticketAmounts) : null;
  const visibleDocuments = documents.filter((doc) => doc.status !== "REJECTED");

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

              {/* Progression du financement — même lecture que côté admin/investisseur :
                  montant levé (validé par un admin) rapporté au montant demandé. */}
              {["PUBLISHED", "FUNDED", "CLOSED"].includes(request.status) && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-slate-700">
                      {fmtAmount(request.amountRaised, request.currency)} levés{" "}
                      <span className="text-slate-400">({progress.toFixed(0)}%)</span>
                    </span>
                    <span className="text-slate-400">
                      Reste {fmtAmount(Math.max(0, requested - raised), request.currency)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
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
                  {requested > 0 && <span className="ml-1 text-[12px] font-normal text-slate-400">({progress.toFixed(0)}%)</span>}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] text-slate-500">Range d'investissement</p>
                <p className="text-[15px] font-semibold text-slate-900">
                  {minTicket === null
                    ? "—"
                    : minTicket === maxTicket
                      ? fmtAmount(minTicket, request.currency)
                      : `${fmtAmount(minTicket, request.currency)} – ${fmtAmount(maxTicket as number, request.currency)}`}
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

            {/* Investisseurs — qui a investi, combien, à quel taux, et quelle part du
                montant demandé ça représente. */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 p-6 pb-4">
                <h2 className="text-[14px] font-semibold text-slate-900">
                  Investisseurs{investors.length > 0 && ` (${investors.length})`}
                </h2>
                {request.investorMode === "SINGLE_INVESTOR" && (
                  <span className="text-[11px] font-medium text-amber-600">Investisseur unique attendu</span>
                )}
              </div>
              {investors.length === 0 ? (
                <p className="px-6 pb-6 text-[13px] text-slate-400">Aucun investisseur pour l'instant.</p>
              ) : (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {investors.map((inv) => {
                    const icfg = INVESTMENT_STATUS_CONFIG[inv.status] ?? INVESTMENT_STATUS_CONFIG.NEGOTIATING;
                    const share = requested > 0 ? (Number(inv.amountCommitted) / requested) * 100 : 0;
                    return (
                      <div key={inv.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900">
                            {inv.investor.firstName} {inv.investor.lastName}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{inv.investor.email}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13px] font-semibold text-slate-900">
                            {fmtAmount(inv.amountCommitted, request.currency)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {inv.lockedReturn ? `${Number(inv.lockedReturn)}%` : "—"} · {share.toFixed(1)}% du montant demandé
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${icfg.className}`}>
                          {icfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Échéancier de remboursement — visible seulement une fois les fonds
                réellement décaissés vers la PME (disbursedAt posé à l'approbation
                d'une réclamation de financement), pas dès le virement investisseur. */}
            {request.disbursedAt && <PmeRepaymentSchedule fundingRequestId={id} />}

            {/* Réclamation des fonds */}
            {["PUBLISHED", "FUNDED", "CLOSED"].includes(request.status) && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Réclamer les fonds</h2>
                <p className="mb-3 text-[12px] text-slate-500">
                  Les virements des investisseurs sont d'abord validés par un admin sur le compte de la
                  plateforme. Vous pouvez réclamer le montant déjà validé à tout moment, même avant que la
                  demande soit intégralement financée — chaque réclamation est ensuite validée par un admin
                  avant versement, net de la commission plateforme de 2%.
                </p>

                <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] text-slate-500">Disponible à réclamer</p>
                  <p className="text-[16px] font-semibold text-slate-900">
                    {claimable === null ? "—" : fmtAmount(claimable, request.currency)}
                  </p>
                </div>

                {claimable !== null && claimable > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={10}
                          max={100}
                          step={1}
                          placeholder="100"
                          value={claimPercent}
                          onChange={(e) => {
                            // min/max sur <input type="number"> ne bloque que les flèches, pas
                            // la saisie clavier — on plafonne donc explicitement à 100 ici.
                            const raw = e.target.value;
                            const next = raw !== "" && Number(raw) > 100 ? "100" : raw;
                            setClaimPercent(next);
                            if (claimAmountError) setClaimAmountError(null);
                          }}
                          className={`h-9 w-24 rounded-[9px] border py-1.5 pl-3 pr-6 text-[13px] text-slate-900 outline-none ${
                            claimAmountError
                              ? "border-red-400 bg-red-50/60 focus:border-red-500"
                              : "border-slate-200 focus:border-blue-400"
                          }`}
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">%</span>
                      </div>
                      <button
                        onClick={handleRequestClaim}
                        disabled={claimSubmitting}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-blue-600 px-4 text-[13px] font-medium text-white shadow-[0_6px_16px_rgba(37,99,235,0.22)] transition hover:-translate-y-px hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {claimSubmitting ? "Envoi..." : "Réclamer"}
                      </button>
                    </div>
                    <FieldError show={!!claimAmountError} msg={claimAmountError ?? ""} />
                    {!claimAmountError && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {claimPercent.trim() && Number.isFinite(Number(claimPercent))
                          ? `= ${fmtAmount(claimable * (Number(claimPercent) / 100), request.currency)}`
                          : `Entre 10% et 100% du disponible, ou laissez vide pour tout réclamer (${fmtAmount(claimable, request.currency)}).`}
                      </p>
                    )}
                  </div>
                )}

                {claims.length > 0 && (
                  <div className="-mx-6 divide-y divide-slate-100 border-t border-slate-100">
                    {claims.map((claim) => {
                      const ccfg = CLAIM_STATUS_CONFIG[claim.status] ?? CLAIM_STATUS_CONFIG.REQUESTED;
                      return (
                        <div key={claim.id} className="flex items-center justify-between gap-3 px-6 py-3">
                          <div>
                            <p className="text-[13px] font-medium text-slate-900">
                              {fmtAmount(claim.amountRequested, request.currency)}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {fmtDate(claim.requestedAt)}
                              {claim.amountNet
                                ? ` · net ${fmtAmount(claim.amountNet, request.currency)} (commission 2%)`
                                : " (commission 2% au versement)"}
                            </p>
                            {claim.status === "REJECTED" && claim.rejectionReason && (
                              <p className="mt-0.5 text-[11px] text-red-600">{claim.rejectionReason}</p>
                            )}
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ccfg.className}`}>
                            {ccfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

            {/* Documents — seuls "en attente" et "validé" sont pertinents ici ; un
                document rejeté se corrige en le remplaçant depuis /dashboard/documents,
                pas depuis cette page en lecture seule. */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-3 text-[14px] font-semibold text-slate-900">
                Documents{visibleDocuments.length > 0 && ` (${visibleDocuments.length})`}
              </h2>
              {visibleDocuments.length === 0 ? (
                <p className="text-[13px] text-slate-400">Aucun document déposé pour cette demande.</p>
              ) : (
                <div className="-mx-6 divide-y divide-slate-100 border-t border-slate-100">
                  {visibleDocuments.map((doc) => {
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
