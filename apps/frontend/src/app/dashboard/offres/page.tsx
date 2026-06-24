"use client";

import { useOffers } from "@/lib/use-offers";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  INTERESTED: { label: "Intéressé", className: "bg-gray-100 text-gray-600" },
  COMMITTED: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  SETTLED_OFF_PLATFORM: { label: "Confirmée", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Annulée", className: "bg-red-100 text-red-700" },
};

export default function OffresPage() {
  const { offers, isLoading } = useOffers();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Offres reçues</h1>
        <p className="text-sm text-gray-500">
          {offers.length} offre{offers.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && offers.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Aucune offre reçue pour le moment.</p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {offers.map((offer) => {
            const statusInfo = STATUS_LABELS[offer.status] ?? STATUS_LABELS.COMMITTED;
            return (
              <div key={offer.id} className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {offer.investor.firstName} {offer.investor.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {Number(offer.amountCommitted).toLocaleString("fr-FR")}{" "}
                    {offer.fundingRequest.currency} · {offer.fundingRequest.title}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.className}`}
                >
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
