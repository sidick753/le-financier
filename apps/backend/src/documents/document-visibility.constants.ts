// Types de document visibles par un investisseur/institution non-membre de
// l'organisation, quand la demande de financement liée est publique (cf.
// PUBLIC_FUNDING_STATUSES) — documents "métier" utiles pour évaluer un dossier.
// KYC_ID / KYC_PROOF_OF_ADDRESS (identité personnelle du dirigeant),
// SETTLEMENT_PROOF et DISPUTE_EVIDENCE restent toujours réservés aux membres
// de l'organisation et à l'admin. Source unique — importée par
// documents.service.ts pour la liste ET le download-url, afin que les deux
// contrôles ne puissent pas diverger.
export const INVESTOR_VISIBLE_DOCUMENT_TYPES: string[] = [
  'ORGANIZATION_LEGAL',
  'FINANCIAL_STATEMENT',
  'FUNDING_REQUEST_ATTACHMENT',
  'OTHER',
];
