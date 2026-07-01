"use client";

import { useState } from "react";
import { useOffers } from "@/lib/use-offers";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  INTERESTED: { label: "Intéressé", className: "bg-gray-100 text-gray-600" },
  NEGOTIATING: { label: "En négociation", className: "bg-yellow-100 text-yellow-700" },
  COMMITTED: { label: "Confirmée", className: "bg-green-100 text-green-700" },
  SETTLED_OFF_PLATFORM: { label: "Réglée", className: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Annulée", className: "bg-gray-100 text-gray-600" },
  REJECTED: { label: "Rejetée", className: "bg-red-100 text-red-700" },
};

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
  const { offers, isLoading, refresh } = useOffers();
  const { token } = useAuth();
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [counterReturn, setCounterReturn] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const negotiatingOffers = offers.filter((o) => o.status === "NEGOTIATING");
  const otherOffers = offers.filter((o) => o.status !== "NEGOTIATING");

  async function handleCounter(offerId: string) {
    setError(null);
    setSuccess(null);
    if (!counterReturn) {
      setError("Saisissez un taux de contre-proposition.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(
        `/investments/${offerId}/counter-offer`,
        { proposedReturn: Number(counterReturn) },
        token!,
      );
      setSuccess("Contre-proposition envoyée à l'investisseur.");
      setCounterReturn("");
      setSelectedOffer(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la contre-proposition.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAccept(offerId: string) {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await api.patch(`/investments/${offerId}/accept-offer`, {}, token!);
      setSuccess("Offre acceptée — l'engagement est maintenant confirmé.");
      setSelectedOffer(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'acceptation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Offres reçues</h1>
        <p className="text-sm text-gray-500">
          {offers.length} offre{offers.length !== 1 ? "s" : ""} au total
          {negotiatingOffers.length > 0 && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              {negotiatingOffers.length} en négociation
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

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
                <div key={offer.id} className="rounded-xl border border-yellow-200 bg-white">
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
                      {/* Historique des propositions */}
                      <p className="mb-3 text-xs font-medium text-gray-700">
                        Historique des propositions
                      </p>
                      <div className="mb-4 space-y-2">
                        {offer.negotiationOffers.map((neg) => (
                          <div
                            key={neg.id}
                            className={`flex items-center justify-between rounded-md p-2 text-xs ${
                              neg.status === "PENDING"
                                ? "bg-yellow-50 font-semibold"
                                : "bg-gray-50 text-gray-400"
                            }`}
                          >
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
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="Votre contre-proposition (%)"
                              value={counterReturn}
                              onChange={(e) => setCounterReturn(e.target.value)}
                              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                            />
                            <button
                              onClick={() => handleCounter(offer.id)}
                              disabled={isSubmitting}
                              className="rounded-md border border-brand-700 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                            >
                              Contre-proposer
                            </button>
                          </div>
                        </div>
                      )}

                      {ballIsInInvestorCourt && (
                        <p className="text-center text-xs text-gray-400">
                          En attente de la réponse de l'investisseur…
                        </p>
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
          <p className="text-sm font-semibold text-gray-900">Toutes les offres</p>
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
            return (
              <div key={offer.id} className="flex items-center justify-between p-5">
                <div>
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
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
