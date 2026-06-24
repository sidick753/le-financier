"use client";

import { usePmeData } from "@/lib/use-pme-data";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-600" },
  UNDER_REVIEW: { label: "En révision", className: "bg-yellow-100 text-yellow-700" },
  PUBLISHED: { label: "Publié", className: "bg-blue-100 text-blue-700" },
  FUNDED: { label: "Financé", className: "bg-green-100 text-green-700" },
  CLOSED: { label: "Clôturé", className: "bg-gray-100 text-gray-600" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Annulé", className: "bg-gray-100 text-gray-600" },
};

export default function DemandesPage() {
  const { fundingRequests, isLoading, error } = usePmeData();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mes demandes</h1>
          <p className="text-sm text-gray-500">
            {fundingRequests.length} demande{fundingRequests.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <button className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          + Nouvelle demande
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        {isLoading && <p className="p-5 text-sm text-gray-400">Chargement...</p>}
        {!isLoading && fundingRequests.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">
              Vous n'avez pas encore de demande de financement.
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {fundingRequests.map((request) => {
            const statusInfo = STATUS_LABELS[request.status] ?? STATUS_LABELS.DRAFT;
            const raised = Number(request.amountRaised);
            const requested = Number(request.amountRequested);
            const progress = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;

            return (
              <div key={request.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{request.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {requested.toLocaleString("fr-FR")} {request.currency} ·{" "}
                      {request._count.investments} offre
                      {request._count.investments !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {(request.status === "PUBLISHED" || request.status === "FUNDED") && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-brand-700 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {raised.toLocaleString("fr-FR")} levés sur{" "}
                      {requested.toLocaleString("fr-FR")} {request.currency} (
                      {progress.toFixed(0)}%)
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
