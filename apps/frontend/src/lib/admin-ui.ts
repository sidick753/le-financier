export const ORG_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "Vérifié", className: "bg-green-100 text-green-700" },
  PENDING: { label: "En attente KYC", className: "bg-yellow-100 text-yellow-700" },
  REJECTED: { label: "Suspendu", className: "bg-red-100 text-red-700" },
};

export const KYC_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "Vérifié", className: "bg-green-100 text-green-700" },
  PENDING: { label: "En attente KYC", className: "bg-yellow-100 text-yellow-700" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
};

export const USER_ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  INVESTOR: { label: "Particulier", className: "bg-blue-50 text-blue-700" },
  INSTITUTION: { label: "Institution", className: "bg-purple-50 text-purple-700" },
};

export const FUNDING_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-600" },
  UNDER_REVIEW: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
  PUBLISHED: { label: "Publiée", className: "bg-blue-100 text-blue-700" },
  FUNDED: { label: "Financée (réclamable)", className: "bg-purple-100 text-purple-700" },
  CLOSED: { label: "Intégralement réclamée", className: "bg-gray-100 text-gray-600" },
  REJECTED: { label: "Rejetée", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Suspendue", className: "bg-orange-100 text-orange-700" },
};

// PayoutClaim.status — partagé par les 3 vues de réclamation (financement côté admin/PME,
// remboursement côté investisseur) pour éviter que les libellés/couleurs ne divergent.
export const CLAIM_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: "En attente de validation", className: "bg-amber-50 text-amber-700" },
  PAID: { label: "Versée", className: "bg-green-50 text-green-700" },
  REJECTED: { label: "Rejetée", className: "bg-red-50 text-red-600" },
};

// Investment.status côté PME (Offres reçues + détail d'une demande) — vocabulaire
// différent de la version admin (qui décrit une action à mener : "Preuve à
// valider"), ici on décrit l'état tel que la PME le vit.
export const INVESTMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  INTERESTED: { label: "Intéressé", className: "bg-gray-100 text-gray-600" },
  NEGOTIATING: { label: "En négociation", className: "bg-yellow-100 text-yellow-700" },
  COMMITTED: { label: "Confirmée", className: "bg-green-100 text-green-700" },
  SETTLEMENT_SUBMITTED: { label: "Preuve soumise", className: "bg-amber-100 text-amber-700" },
  SETTLED_OFF_PLATFORM: { label: "Réglée", className: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Annulée", className: "bg-gray-100 text-gray-600" },
  REJECTED: { label: "Rejetée", className: "bg-red-100 text-red-700" },
};

export function formatAdminDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Format compact pour les tableaux/cartes de stats : "2.3M", "480K"...
export function formatCompactAmount(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}Md`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("fr-FR");
}

// Format complet pour les pages de détail : "2 340 000 FCFA".
export function formatFullAmount(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

// Formatage à la saisie : ajoute les séparateurs de milliers pendant que
// l'utilisateur tape (ex : "10000000" -> "10 000 000"). À coupler avec
// parseAmountInput() pour récupérer la valeur numérique à l'envoi.
// Tronque une éventuelle partie décimale (ex : Decimal Prisma "5000000.50"
// renvoyé tel quel par l'API) avant de retirer les séparateurs : sans ça, le
// "." disparaîtrait avec le reste et les centimes se retrouveraient concaténés
// à la partie entière (5000000.50 -> 500000050).
export function formatAmountInput(raw: string) {
  const n = parseInt(raw.split(".")[0].replace(/\D/g, ""), 10);
  return isNaN(n) ? "" : n.toLocaleString("fr-FR");
}

// Reconvertit une valeur saisie via formatAmountInput() en nombre.
export function parseAmountInput(formatted: string) {
  return parseInt(formatted.replace(/\D/g, ""), 10);
}

export function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}
