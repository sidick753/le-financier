export interface KycRequirement {
  key: string;
  label: string;
  documentType: string;
}

export function getKycRequirements(): KycRequirement[] {
  const currentYear = new Date().getFullYear();
  return [
    { key: 'RCCM',                              label: 'RCCM',                              documentType: 'ORGANIZATION_LEGAL'  },
    { key: `BILAN_${currentYear - 2}`,          label: `Bilan ${currentYear - 2}`,          documentType: 'FINANCIAL_STATEMENT' },
    { key: `BILAN_${currentYear - 1}`,          label: `Bilan ${currentYear - 1}`,          documentType: 'FINANCIAL_STATEMENT' },
    { key: 'CNI_DIRIGEANT',                     label: 'Carte CNI Dirigeant',               documentType: 'KYC_ID'              },
    { key: `ATTESTATION_FISCALE_${currentYear}`,label: `Attestation fiscale ${currentYear}`,documentType: 'FINANCIAL_STATEMENT' },
    { key: 'PLAN_TRESORERIE',                   label: 'Plan de trésorerie',                documentType: 'FINANCIAL_STATEMENT' },
  ];
}
