export interface FundingDocument {
  id: string;
  type: string;
  fileName: string;
  title?: string | null;
  sizeBytes: number;
  status: string;
  createdAt: string;
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  KYC_ID: "Pièce d'identité",
  KYC_PROOF_OF_ADDRESS: "Justificatif de domicile",
  ORGANIZATION_LEGAL: "Document légal",
  FINANCIAL_STATEMENT: "États financiers",
  FUNDING_REQUEST_ATTACHMENT: "Pièce jointe",
  SETTLEMENT_PROOF: "Preuve de paiement",
  DISPUTE_EVIDENCE: "Pièce de litige",
  OTHER: "Autre",
};

export const DOCUMENT_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  PENDING_REVIEW: { label: "En revue", badgeClass: "bg-amber-50 text-amber-600" },
  APPROVED:       { label: "Validé",   badgeClass: "bg-green-50 text-green-600" },
  REJECTED:       { label: "Rejeté",   badgeClass: "bg-red-50 text-red-600" },
};

export function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1_000))} Ko`;
}
