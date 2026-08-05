"use client";

import { usePushNotifications } from "@/lib/use-push-notifications";
import { alertError, alertSuccess } from "@/lib/alert";

// Bloc "Notifications push" — identique pour les 4 rôles (PME_OWNER, INVESTOR,
// INSTITUTION, ADMIN), tous notifiés via le même NotificationsService.notify()
// côté backend (voir push.service.ts).
export function PushNotificationsSection() {
  const { isSupported, isChecking, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  async function handleToggle() {
    try {
      if (isSubscribed) {
        await unsubscribe();
        alertSuccess("Notifications push désactivées sur cet appareil.");
      } else {
        await subscribe();
        if (Notification.permission === "granted") {
          alertSuccess("Notifications push activées sur cet appareil.");
        }
      }
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors de l'activation des notifications push.");
    }
  }

  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-1 text-lg font-bold text-gray-900">Notifications push</p>
      <p className="mb-4 text-xs text-gray-500">
        Recevez une notification sur cet appareil dès qu'une offre, un virement ou une réclamation
        vous concerne — même onglet fermé. En plus des notifications déjà visibles dans la cloche et par email.
      </p>

      {isChecking ? (
        <p className="text-xs text-gray-400">Vérification du support...</p>
      ) : !isSupported ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
          Votre navigateur ne prend pas en charge les notifications push.
        </p>
      ) : permission === "denied" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          Notifications bloquées pour ce site — autorisez-les dans les paramètres de votre navigateur pour les activer.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              isSubscribed
                ? "border border-red-200 text-red-600 hover:bg-red-50"
                : "bg-brand-700 text-white hover:bg-brand-800"
            }`}
          >
            {isLoading ? "..." : isSubscribed ? "Désactiver sur cet appareil" : "Activer sur cet appareil"}
          </button>
          {isSubscribed && (
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Activées
            </span>
          )}
        </div>
      )}
    </div>
  );
}
