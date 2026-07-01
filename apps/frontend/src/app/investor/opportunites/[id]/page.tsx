"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

// ── types ─────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Facture",
  PRET:    "Prêt",
  EQUITY:  "Equity",
};

const CATEGORY_BADGE: Record<string, string> = {
  FACTURE: "bg-blue-100 text-blue-700",
  PRET:    "bg-green-100 text-green-700",
  EQUITY:  "bg-purple-100 text-purple-700",
};

interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  currency: string;
  organization: { legalName: string };
}

interface NegotiationOffer {
  id: string;
  proposedBy: "INVESTOR" | "PME";
  proposedReturn: string;
  status: string;
  createdAt: string;
}

interface MyEngagement {
  id: string;
  amountCommitted: string;
  status: string;
  lockedReturn: string | null;
  negotiationOffers: NegotiationOffer[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(v: string | number) {
  return `${Number(v).toLocaleString("fr-FR")} F CFA`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, valueClass = "text-slate-900",
}: {
  label: string; value: string; icon: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
      </div>
      <p className={`text-[15px] font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function OfferStatusBadge({ status }: { status: string }) {
  if (status === "PENDING")   return <span className="text-[11px] font-semibold text-blue-600">En attente</span>;
  if (status === "ACCEPTED")  return <span className="text-[11px] font-semibold text-green-600">Accepté</span>;
  if (status === "COUNTERED") return <span className="text-[11px] text-slate-400">Contré</span>;
  if (status === "REJECTED")  return <span className="text-[11px] text-red-500">Rejeté</span>;
  return <span className="text-[11px] text-slate-400">{status}</span>;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [engagement, setEngagement]   = useState<MyEngagement | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [amount, setAmount]                 = useState("");
  const [proposedReturn, setProposedReturn] = useState("");
  const [counterReturn, setCounterReturn]   = useState("");
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess]   = useState<string | null>(null);

  const [isFavorited, setIsFavorited]       = useState(false);
  const [favLoading, setFavLoading]         = useState(false);

  async function refreshEngagement() {
    if (!token) return;
    try {
      const eng = await api.get<MyEngagement>(`/investments/my-engagement/${id}`, token);
      setEngagement(eng);
    } catch {
      // pas encore d'engagement
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const opp = await api.get<Opportunity>(`/funding-requests/${id}`);
        setOpportunity(opp);
        if (opp.expectedReturn) setProposedReturn(String(Number(opp.expectedReturn)));
        await refreshEngagement();
        if (token) {
          try {
            const fav = await api.get<{ favorited: boolean }>(`/watchlist/${id}/status`, token);
            setIsFavorited(fav.favorited);
          } catch { /* ignore */ }
        }
      } catch {
        setError("Impossible de charger cette opportunité.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function handleEngage() {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!amount || !proposedReturn) {
      setSubmitError("Veuillez saisir un montant et un taux.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/investments", {
        fundingRequestId: id,
        amountCommitted:  Number(amount),
        proposedReturn:   Number(proposedReturn),
      }, token!);
      setSubmitSuccess("Votre proposition a été envoyée à la PME.");
      await refreshEngagement();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCounter() {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!engagement || !counterReturn) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/investments/${engagement.id}/counter-offer`, { proposedReturn: Number(counterReturn) }, token!);
      setSubmitSuccess("Contre-proposition envoyée.");
      setCounterReturn("");
      await refreshEngagement();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleFavorite() {
    if (!token) return;
    setFavLoading(true);
    try {
      if (isFavorited) {
        await api.delete(`/watchlist/${id}`, token);
        setIsFavorited(false);
      } else {
        await api.post(`/watchlist/${id}`, {}, token);
        setIsFavorited(true);
      }
    } catch { /* ignore */ } finally {
      setFavLoading(false);
    }
  }

  async function handleAccept() {
    setSubmitError(null);
    if (!engagement) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/investments/${engagement.id}/accept-offer`, {}, token!);
      setSubmitSuccess("Offre acceptée ! Votre engagement est confirmé.");
      await refreshEngagement();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── loading / error ──

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-[13px] text-slate-400">Chargement...</p>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-[13px] text-red-500">{error ?? "Opportunité introuvable."}</p>
      </div>
    );
  }

  // ── computed ──

  const requested  = Number(opportunity.amountRequested);
  const raised     = Number(opportunity.amountRaised);
  const remaining  = requested - raised;
  const progress   = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;

  const lastOffer        = engagement?.negotiationOffers?.[0] ?? null;
  const isCommitted      = engagement?.status === "COMMITTED";
  const isNegotiating    = engagement?.status === "NEGOTIATING";
  const pmeHasBall       = lastOffer?.proposedBy === "PME" && lastOffer?.status === "PENDING";
  const investorWaiting  = lastOffer?.proposedBy === "INVESTOR" && lastOffer?.status === "PENDING";

  const gainEstimate  = amount && proposedReturn
    ? Number(amount) * Number(proposedReturn) / 100
    : 0;
  const totalEstimate = Number(amount || 0) + gainEstimate;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Topbar */}
      <header className="sticky top-0 z-10 flex h-15 items-center gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <button
          onClick={() => router.push("/investor/explorer")}
          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Retour aux opportunités
        </button>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[22px] font-extrabold tracking-tight text-slate-900">
              {opportunity.organization.legalName}
            </p>
            <p className="text-[14px] text-slate-500">{opportunity.title}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${CATEGORY_BADGE[opportunity.category] ?? "bg-slate-100 text-slate-600"}`}>
            {CATEGORY_LABELS[opportunity.category] ?? opportunity.category}
          </span>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-4 gap-3.5">
          <StatCard
            label="Montant"
            value={fmtAmount(opportunity.amountRequested)}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          />
          <StatCard
            label="Rendement proposé"
            value={opportunity.expectedReturn ? `${Number(opportunity.expectedReturn)}%` : "—"}
            valueClass="text-green-600"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 20.5 8.5 10.5 1 18" /></svg>}
          />
          <StatCard
            label="Durée"
            value={opportunity.durationMonths ? `${opportunity.durationMonths} mois` : "—"}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
          />
          <StatCard
            label="Score risque"
            value="Non évalué"
            valueClass="text-slate-300"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">

          {/* Colonne principale */}
          <div className="col-span-2 space-y-4">

            {/* Description */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-2.5 text-[13px] font-bold text-slate-900">Description du projet</p>
              <p className="text-[13px] leading-relaxed text-slate-600">{opportunity.description}</p>
            </div>

            {/* Progression */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-3 text-[13px] font-bold text-slate-900">Progression du financement</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>{fmtAmount(raised)} levés</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
                <span>Reste {fmtAmount(remaining)}</span>
              </div>
            </div>

            {/* Onglets — à venir */}
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
              <div className="flex border-b border-slate-100">
                {["Analyse financière", "L'entreprise", "Documents"].map((tab) => (
                  <div key={tab} className="px-5 py-3 text-[12px] font-medium text-slate-400">
                    {tab}
                  </div>
                ))}
              </div>
              <div className="px-5 py-10 text-center">
                <p className="text-[12px] text-slate-400">
                  Les indicateurs financiers, données entreprise et documents PME seront disponibles avec le module scoring et les données KYC validées.
                </p>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="space-y-4">

            {/* Évaluation du risque */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5 text-center">
              <p className="mb-2 text-[13px] font-bold text-slate-900">Évaluation du risque</p>
              <p className="text-[32px] font-extrabold text-slate-200">—</p>
              <p className="mt-1 text-[11px] text-slate-400">Disponible avec le module scoring</p>
            </div>

            {/* Bloc engagement / négociation */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-0.5 text-[13px] font-bold text-slate-900">Faire une offre</p>
              <p className="mb-4 text-[11px] text-slate-500">
                Proposez un montant et un taux pour cette opportunité
              </p>

              {submitError && (
                <div className="mb-3 rounded-[8px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{submitError}</div>
              )}
              {submitSuccess && (
                <div className="mb-3 rounded-[8px] bg-green-50 px-3 py-2 text-[12px] text-green-700">{submitSuccess}</div>
              )}

              {/* COMMITTED */}
              {isCommitted && (
                <div className="rounded-[10px] bg-green-50 p-4 text-center">
                  <svg className="mx-auto mb-2 text-green-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-[13px] font-bold text-green-700">Engagement confirmé</p>
                  <p className="text-[12px] text-green-600">
                    Taux figé : {Number(engagement?.lockedReturn)}%
                  </p>
                </div>
              )}

              {/* NEGOTIATING */}
              {isNegotiating && (
                <div className="space-y-3">
                  {/* Historique */}
                  <div className="rounded-[8px] bg-slate-50 p-3">
                    <p className="mb-2 text-[11px] font-bold text-slate-700">Historique des propositions</p>
                    <div className="space-y-1.5">
                      {engagement!.negotiationOffers.map((offer) => (
                        <div key={offer.id} className={`flex items-center justify-between text-[12px] ${offer.status === "PENDING" ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                          <span>{offer.proposedBy === "INVESTOR" ? "Vous" : "PME"}</span>
                          <span className="font-bold">{Number(offer.proposedReturn)}%</span>
                          <OfferStatusBadge status={offer.status} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PME a la balle — on peut accepter ou contre-proposer */}
                  {pmeHasBall && (
                    <>
                      <p className="text-[12px] text-slate-600">
                        La PME propose <strong>{Number(lastOffer!.proposedReturn)}%</strong>
                      </p>
                      <button
                        onClick={handleAccept}
                        disabled={isSubmitting}
                        className="w-full rounded-[8px] bg-green-600 py-2 text-[13px] font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        Accepter {Number(lastOffer!.proposedReturn)}%
                      </button>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Votre contre-taux (%)"
                          value={counterReturn}
                          onChange={(e) => setCounterReturn(e.target.value)}
                          className="flex-1 rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                        />
                        <button
                          onClick={handleCounter}
                          disabled={isSubmitting || !counterReturn}
                          className="shrink-0 rounded-[8px] border border-slate-300 px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Contre-proposer
                        </button>
                      </div>
                    </>
                  )}

                  {/* On a la balle — attente PME */}
                  {investorWaiting && (
                    <div className="flex items-center gap-2 rounded-[8px] bg-amber-50 px-3 py-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      <p className="text-[12px] text-amber-700">En attente de la réponse de la PME…</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pas encore d'engagement */}
              {!engagement && remaining <= 0 && (
                <div className="rounded-[10px] bg-slate-50 p-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-500">Financement complet</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    Cette opportunité est entièrement souscrite.
                  </p>
                </div>
              )}

              {!engagement && remaining > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Montant (F CFA)</label>
                    <input
                      type="number"
                      placeholder={`Max : ${remaining.toLocaleString("fr-FR")}`}
                      value={amount}
                      max={remaining}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Taux proposé (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={proposedReturn}
                      onChange={(e) => setProposedReturn(e.target.value)}
                      className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                    />
                    {opportunity.expectedReturn && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Taux PME : {Number(opportunity.expectedReturn)}%
                      </p>
                    )}
                  </div>

                  {amount && proposedReturn && (
                    <div className="rounded-[8px] bg-slate-50 p-3 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gain estimé</span>
                        <span className="font-semibold text-green-600">{fmtAmount(gainEstimate)}</span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="text-slate-500">Total à recevoir</span>
                        <span className="font-bold text-slate-900">{fmtAmount(totalEstimate)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleEngage}
                    disabled={isSubmitting}
                    className="w-full rounded-[8px] bg-blue-700 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    {isSubmitting ? "Envoi..." : "Investir maintenant"}
                  </button>
                </div>
              )}

              {/* Bouton favoris — toujours visible */}
              <button
                onClick={handleToggleFavorite}
                disabled={favLoading}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-[8px] border py-2.5 text-[13px] font-medium transition disabled:opacity-50 ${
                  isFavorited
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill={isFavorited ? "currentColor" : "none"}
                  stroke="currentColor" strokeWidth="2"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {isFavorited ? "Retiré des favoris" : "Ajouter à mes favoris"}
              </button>
            </div>

            {/* Aide */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-1 text-[13px] font-bold text-slate-900">Besoin d'aide ?</p>
              <p className="mb-3 text-[11px] text-slate-500">
                Notre équipe est disponible pour vous accompagner dans votre décision.
              </p>
              <button className="w-full rounded-[8px] border border-slate-200 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
                Contacter un conseiller
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
