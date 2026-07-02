import { FundingRequest, FundingCategory } from '@le-financier/database';

export interface CreateFundingRequestData {
  organizationId: string;
  title: string;
  description: string;
  category: FundingCategory;
  amountRequested: number;
  expectedReturn?: number;
  durationMonths?: number;

  // Scoring FACTURE
  debiteurNom?: string;
  debiteurType?: string;
  debiteurSolvabilite?: string;
  echeanceFactureDate?: string;
  ancienneteRelation?: string;
  partPlusGrosClient?: number;
  delaiPaiementMenu?: string;
  tauxImpaye12m?: number;
  nbClientsActifs?: number;

  // Scoring PRET MLT
  cashFlowAnnuel?: number;
  fluxMobileMoneyMensuel?: number;
  autonomieFinanciere?: number;
  tauxEndettement?: number;
  ratioLiquidite?: number;
  garantieType?: string;
  garantieCouverture?: number;
  dirigeantExperienceAns?: number;
  dirigeantAntecedents?: string;
  dirigeantIncidentsLegaux?: string;
  secteurCode?: string;
  secteurSaisonnalite?: boolean;
  secteurImportDevises?: boolean;
  secteurSoutienPublic?: boolean;

  // Scoring EQUITY
  tcamCa3ans?: number;
  tailleMarche?: string;
  scalabilite?: string;
  experienceSecteurAns?: number;
  trackRecord?: string;
  completudeEquipe?: string;
  moat?: string;
  partMarcheRelative?: string;
  runwayMois?: number;
  margeBrute?: number;
  droitsInvestisseur?: string;
  transparence?: string;
}

export interface IFundingRepository {
  findById(id: string): Promise<FundingRequest | null>;
  findAllByOrganizationId(organizationId: string): Promise<FundingRequest[]>;
  findAllPublished(filters?: { category?: string; search?: string }): Promise<FundingRequest[]>;
  findAllForAdmin(): Promise<any[]>;
  create(data: CreateFundingRequestData): Promise<FundingRequest>;
  updateStatus(id: string, status: FundingRequest['status']): Promise<FundingRequest>;
}
