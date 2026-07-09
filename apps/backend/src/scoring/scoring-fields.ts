// Champs propres à CHAQUE demande, stockés sur ScoringInput — utilisés à la fois
// pour savoir si une demande a des données de scoring exploitables
// (funding.repository.ts) et pour calculer la complétude d'un dossier (scoring.service.ts).
// Le profil de la PME elle-même (secteur, santé financière, dirigeant, équipe/gouvernance/
// marché) vit sur Organization — voir ORG_PROFILE_FIELDS_BY_PRODUCT ci-dessous — et est
// partagé par toutes les demandes de cette organisation plutôt que ressaisi à chaque fois.

export const SCORING_FIELDS_FACTURE = [
  'debiteurNom', 'debiteurType', 'debiteurSolvabilite', 'echeanceFactureDate',
  'ancienneteRelation', 'partPlusGrosClient', 'delaiPaiementMenu', 'tauxImpaye12m',
] as const;

export const SCORING_FIELDS_PRET = ['garantieType', 'garantieCouverture'] as const;

export const SCORING_FIELDS_EQUITY = [] as const;

export const ALL_SCORING_FIELDS = [
  ...SCORING_FIELDS_FACTURE,
  ...SCORING_FIELDS_PRET,
  ...SCORING_FIELDS_EQUITY,
] as const;

export type ScoringField = typeof ALL_SCORING_FIELDS[number];

export const SCORING_FIELDS_BY_PRODUCT: Record<string, readonly ScoringField[]> = {
  FACTURE: SCORING_FIELDS_FACTURE,
  PRET: SCORING_FIELDS_PRET,
  EQUITY: SCORING_FIELDS_EQUITY,
};

// Champs du profil de crédit de la PME (Organization), partagés par toutes ses demandes.
export const ORG_PROFILE_FIELDS_FACTURE = ['nbClientsActifs'] as const;

export const ORG_PROFILE_FIELDS_PRET = [
  'secteurCode', 'secteurSaisonnalite', 'secteurImportDevises', 'secteurSoutienPublic',
  'cashFlowAnnuel', 'fluxMobileMoneyMensuel', 'autonomieFinanciere', 'tauxEndettement',
  'ratioLiquidite', 'dirigeantExperienceAns', 'dirigeantAntecedents', 'dirigeantIncidentsLegaux',
] as const;

export const ORG_PROFILE_FIELDS_EQUITY = [
  'tcamCa3ans', 'tailleMarche', 'scalabilite', 'experienceSecteurAns', 'trackRecord',
  'completudeEquipe', 'moat', 'partMarcheRelative', 'runwayMois', 'margeBrute',
  'droitsInvestisseur', 'transparence',
] as const;

export type OrgProfileField =
  | typeof ORG_PROFILE_FIELDS_FACTURE[number]
  | typeof ORG_PROFILE_FIELDS_PRET[number]
  | typeof ORG_PROFILE_FIELDS_EQUITY[number];

export const ORG_PROFILE_FIELDS_BY_PRODUCT: Record<string, readonly OrgProfileField[]> = {
  FACTURE: ORG_PROFILE_FIELDS_FACTURE,
  PRET: ORG_PROFILE_FIELDS_PRET,
  EQUITY: ORG_PROFILE_FIELDS_EQUITY,
};
