export interface FundingDocument {
  id: string;
  type: string;
  kycRequirementKey?: string | null;
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

// Plusieurs exigences KYC (ex: Bilan 2024, Bilan 2025, Attestation fiscale, Plan de
// trésorerie) partagent le même DocumentType FINANCIAL_STATEMENT — kycRequirementKey
// (via kycLabelsByKey, ex: { BILAN_2024: "Bilan 2024" }) permet de les distinguer à l'affichage.
export function getDocumentLabel(
  doc: Pick<FundingDocument, "type" | "kycRequirementKey">,
  kycLabelsByKey: Record<string, string>,
) {
  if (doc.kycRequirementKey && kycLabelsByKey[doc.kycRequirementKey]) {
    return kycLabelsByKey[doc.kycRequirementKey];
  }
  return DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type;
}

export function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1_000))} Ko`;
}
