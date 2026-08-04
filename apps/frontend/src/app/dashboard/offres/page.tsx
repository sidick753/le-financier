"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useOffers } from "@/lib/use-offers";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useNegotiationSocket } from "@/lib/use-negotiation-socket";
import { usePmeBadges } from "@/lib/pme-badges-context";
import { useNotifications } from "@/lib/use-notifications";
import { alertError, alertSuccess, confirmDialog } from "@/lib/alert";
import { FieldError } from "@/components/ui/field-error";
import { INVESTMENT_STATUS_CONFIG as STATUS_LABELS } from "@/lib/admin-ui";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OffresPage() {
  return (
    <Suspense fallback={null}>
      <OffresPageContent />
    </Suspense>
  );
}

function OffresPageContent() {
  const { offers, isLoading, refresh } = useOffers();
  const { token } = useAuth();
  const { refreshBadges } = usePmeBadges();
  const { markAllAsReadForLink } = useNotifications();
  const searchParams = useSearchParams();
  // Depuis une notification (nouvelle offre, contre-proposition, annulation...) :
  // ouvre et scrolle directement sur l'offre concernée plutôt que la liste entière.
  const targetOfferId = searchParams.get("offer");
  const [selectedOffer, setSelectedOffer] = useState<string | null>(targetOfferId);
  const [counterReturn, setCounterReturn] = useState("");
  const [counterConditions, setCounterConditions] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counterReturnError, setCounterReturnError] = useState(false);
  // HTMLElement (pas HTMLDivElement) : partagé entre la section négociation (div)
  // et la liste "Toutes les offres" (Link → <a>), qui pointe désormais vers le
  // détail de la demande plutôt que de rester une simple div.
  const targetRef = useRef<HTMLElement | null>(null);
  const [scrolledToTarget, setScrolledToTarget] = useState(false);

  useNegotiationSocket(() => {
    refresh();
    refreshBadges();
  });

  // Efface le badge "nouvellement confirmée" du menu dès que la PME consulte la page.
  useEffect(() => {
    markAllAsReadForLink("/dashboard/offres");
  }, [markAllAsReadForLink]);

  // Une fois les offres chargées, scrolle jusqu'à celle visée par la notification
  // (ne se déclenche qu'une fois, après le rendu du panneau éventuellement déplié).
  useEffect(() => {
    if (!targetOfferId || scrolledToTarget || isLoading || offers.length === 0) return;
    const id = requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrolledToTarget(true);
    });
    return () => cancelAnimationFrame(id);
  }, [targetOfferId, scrolledToTarget, isLoading, offers.length]);

  const negotiatingOffers = offers.filter((o) => o.status === "NEGOTIATING");
  const otherOffers = offers.filter((o) => o.status !== "NEGOTIATING");

  async function handleCounter(offerId: string) {
    if (!counterReturn) {
      setCounterReturnError(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(
        `/investments/${offerId}/counter-offer`,
        {
          proposedReturn: Number(counterReturn),
          conditions:     counterConditions.trim() || undefined,
          note:           counterNote.trim() || undefined,
        },
        token!,
      );
      alertSuccess("Contre-proposition envoyée à l'investisseur.");
      setCounterReturn("");
      setCounterConditions("");
      setCounterNote("");
      setSelectedOffer(null);
      refresh();
      refreshBadges();
    } catch (err) {
      console.error("[handleCounter]", err);
      alertError(err instanceof Error ? err.message : "Échec de la contre-proposition.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(offerId: string) {
    if (!(await confirmDialog("Mettre fin à cette négociation ? Cette action est définitive.", { confirmText: "Mettre fin" }))) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/investments/${offerId}/reject-offer`, {}, token!);
      alertSuccess("Négociation close.");
      setSelectedOffer(null);
      refresh();
      refreshBadges();
    } catch (err) {
      console.error("[handleReject]", err);
      alertError(err instanceof Error ? err.message : "Échec.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAccept(offerId: string) {
    if (!(await confirmDialog("Accepter cette offre ? L'engagement sera définitivement confirmé.", { confirmText: "Accepter", danger: false }))) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/investments/${offerId}/accept-offer`, {}, token!);
      alertSuccess("Offre acceptée — l'engagement est maintenant confirmé.");
      setSelectedOffer(null);
      refresh();
      refreshBadges();
    } catch (err) {
      console.error("[handleAccept]", err);
      alertError(err instanceof Error ? err.message : "Échec de l'acceptation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[15px] font-black tracking-tight text-gray-900">Offres reçues</p>
          <p className="text-xs text-gray-500">
            {offers.length} offre{offers.length !== 1 ? "s" : ""} au total
            {negotiatingOffers.length > 0 && (
              <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                {negotiatingOffers.length} en négociation
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="p-8">
      {/* Offres en négociation — action requise */}
      {negotiatingOffers.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            ⚡ Action requise — En négociation
          </p>
          <div className="space-y-3">
            {negotiatingOffers.map((offer) => {
              const lastOffer = offer.negotiationOffers[0];
              const isExpanded = selectedOffer === offer.id;
              const ballIsInPMECourt = lastOffer?.proposedBy === "INVESTOR" && lastOffer?.status === "PENDING";
              const ballIsInInvestorCourt = lastOffer?.proposedBy === "PME" && lastOffer?.status === "PENDING";

              return (
                <div
                  key={offer.id}
                  ref={offer.id === targetOfferId ? (el) => { targetRef.current = el; } : undefined}
                  className={`rounded-xl border bg-white transition ${
                    offer.id === targetOfferId ? "border-blue-400 ring-2 ring-blue-200" : "border-yellow-200"
                  }`}
                >
                  <button
                    onClick={() => setSelectedOffer(isExpanded ? null : offer.id)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {offer.investor.firstName} {offer.investor.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Number(offer.amountCommitted).toLocaleString("fr-FR")}{" "}
                        {offer.fundingRequest.currency} · {offer.fundingRequest.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {offer.conditions && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          Conditions jointes
                        </span>
                      )}
                      {ballIsInPMECourt && (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                          Votre tour
                        </span>
                      )}
                      {ballIsInInvestorCourt && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          En attente investisseur
                        </span>
                      )}
                      <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5">
                      {/* Conditions actuelles — suivent le dernier tour de négociation */}
                      {offer.conditions && (
                        <div className="mb-4 rounded-md bg-gray-50 p-3">
                          <p className="mb-1 text-xs font-medium text-gray-700">
                            Conditions actuelles
                          </p>
                          <p className="text-xs text-gray-600">{offer.conditions}</p>
                        </div>
                      )}

                      {/* Historique des propositions */}
                      <p className="mb-3 text-xs font-medium text-gray-700">
                        Historique des propositions
                      </p>
                      <div className="mb-4 space-y-2">
                        {offer.negotiationOffers.map((neg) => (
                          <div
                            key={neg.id}
                            className={`rounded-md p-2 text-xs ${
                              neg.status === "PENDING"
                                ? "bg-yellow-50 font-semibold"
                                : "bg-gray-50 text-gray-400"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>
                                {neg.proposedBy === "INVESTOR"
                                  ? `${offer.investor.firstName} (Investisseur)`
                                  : "Vous (PME)"}
                              </span>
                              <span className="font-medium">{Number(neg.proposedReturn)}%</span>
                              <span className="text-gray-400">{formatDate(neg.createdAt)}</span>
                              <span
                                className={
                                  neg.status === "PENDING"
                                    ? "text-yellow-600"
                                    : neg.status === "ACCEPTED"
                                      ? "text-green-600"
                                      : "text-gray-400"
                                }
                              >
                                {neg.status === "PENDING"
                                  ? "En attente"
                                  : neg.status === "ACCEPTED"
                                    ? "Accepté"
                                    : "Contré"}
                              </span>
                            </div>
                            {neg.conditions && (
                              <p className="mt-1 font-normal text-gray-500">
                                <span className="font-medium">Conditions : </span>{neg.conditions}
                              </p>
                            )}
                            {neg.note && (
                              <p className="mt-1 font-normal italic text-gray-500">« {neg.note} »</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Actions si c'est le tour de la PME */}
                      {ballIsInPMECourt && (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-600">
                            L'investisseur propose{" "}
                            <strong>{Number(lastOffer?.proposedReturn)}%</strong>
                          </p>
                          <button
                            onClick={() => handleAccept(offer.id)}
                            disabled={isSubmitting}
                            className="w-full rounded-md bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            ✓ Accepter {Number(lastOffer?.proposedReturn)}%
                          </button>
                          <div>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="Votre contre-proposition (%)"
                                value={counterReturn}
                                onChange={(e) => {
                                  setCounterReturn(e.target.value);
                                  if (counterReturnError) setCounterReturnError(false);
                                }}
                                className={`flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none ${
                                  counterReturnError
                                    ? "border-red-400 bg-red-50/60 focus:border-red-500"
                                    : "border-gray-200 focus:border-brand-700"
                                }`}
                              />
                              <button
                                onClick={() => handleCounter(offer.id)}
                                disabled={isSubmitting}
                                className="rounded-md border border-brand-700 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                              >
                                Contre-proposer
                              </button>
                            </div>
                            <FieldError msg="Saisissez un taux de contre-proposition." show={counterReturnError} />
                          </div>
                          <textarea
                            rows={2}
                            maxLength={1000}
                            placeholder={`Conditions (optionnel — vide = inchangées : ${offer.conditions || "aucune"})`}
                            value={counterConditions}
                            onChange={(e) => setCounterConditions(e.target.value)}
                            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-xs focus:border-brand-700 focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            maxLength={1000}
                            placeholder="Message accompagnant votre contre-proposition (optionnel)"
                            value={counterNote}
                            onChange={(e) => setCounterNote(e.target.value)}
                            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-xs focus:border-brand-700 focus:outline-none"
                          />
                          <button
                            onClick={() => handleReject(offer.id)}
                            disabled={isSubmitting}
                            className="w-full text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            Refuser et clore la négociation
                          </button>
                        </div>
                      )}

                      {ballIsInInvestorCourt && (
                        <div className="space-y-2">
                          <p className="text-center text-xs text-gray-400">
                            En attente de la réponse de l'investisseur…
                          </p>
                          <button
                            onClick={() => handleReject(offer.id)}
                            disabled={isSubmitting}
                            className="w-full rounded-md border border-red-200 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Annuler ma négociation
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toutes les autres offres */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-base font-semibold text-gray-900">Toutes les offres</p>
        </div>

        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && offers.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Aucune offre reçue pour le moment.</p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {offers.map((offer) => {
            const statusInfo = STATUS_LABELS[offer.status] ?? STATUS_LABELS.NEGOTIATING;
            // Une offre acceptée/rejetée sort de "En négociation" et n'apparaît plus
            // que dans cette liste — c'est donc ici qu'il faut aussi cibler le scroll.
            const isTarget = offer.id === targetOfferId && offer.status !== "NEGOTIATING";
            // Le virement validé se réclame sur la fiche de la demande (voir
            // "Réclamer les fonds" sur /dashboard/demandes/[id]), pas ici — chaque
            // offre y renvoie donc pour que la PME puisse consulter son opportunité
            // et, une fois SETTLED_OFF_PLATFORM, réclamer le montant.
            return (
              <Link
                key={offer.id}
                href={`/dashboard/demandes/${offer.fundingRequest.id}`}
                ref={isTarget ? (el) => { targetRef.current = el; } : undefined}
                className={`flex items-center justify-between gap-3 p-5 transition hover:bg-gray-50 ${
                  isTarget ? "bg-blue-50/60 ring-2 ring-inset ring-blue-200" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {offer.investor.firstName} {offer.investor.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {Number(offer.amountCommitted).toLocaleString("fr-FR")}{" "}
                    {offer.fundingRequest.currency} · {offer.fundingRequest.title}
                    {offer.lockedReturn && (
                      <span className="ml-1 text-green-600">· {Number(offer.lockedReturn)}% figé</span>
                    )}
                  </p>
                  {offer.conditions && (
                    <p className="mt-0.5 text-xs italic text-gray-400">Conditions : {offer.conditions}</p>
                  )}
                  {offer.status === "SETTLED_OFF_PLATFORM" && (
                    <p className="mt-0.5 text-xs font-medium text-blue-600">
                      Virement confirmé — réclamer les fonds sur la demande →
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-300">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      </div>
    </>
  );
}
