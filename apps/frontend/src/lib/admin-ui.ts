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
  FUNDED: { label: "En financement", className: "bg-purple-100 text-purple-700" },
  CLOSED: { label: "Clôturée", className: "bg-gray-100 text-gray-600" },
  REJECTED: { label: "Rejetée", className: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Suspendue", className: "bg-orange-100 text-orange-700" },
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

export function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}
