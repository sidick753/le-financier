import { FundingRequest, FundingCategory } from '@le-financier/database';

export interface CreateFundingRequestData {
  organizationId: string;
  title: string;
  description: string;
  category: FundingCategory;
  amountRequested: number;
  expectedReturn?: number;
  durationMonths?: number;

  // Scoring FACTURE — ce débiteur, cette facture précise
  debiteurNom?: string;
  debiteurType?: string;
  debiteurSolvabilite?: string;
  echeanceFactureDate?: string;
  ancienneteRelation?: string;
  partPlusGrosClient?: number;
  delaiPaiementMenu?: string;
  tauxImpaye12m?: number;

  // Scoring PRET MLT — la garantie offerte pour ce prêt précis
  garantieType?: string;
  garantieCouverture?: number;
}

export interface UpdateFundingRequestData {
  title?: string;
  description?: string;
  category?: FundingCategory;
  amountRequested?: number;
  expectedReturn?: number;
  durationMonths?: number;
}

export interface FundingAdminFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FundingAdminStats {
  total: number;
  underReview: number;
  published: number;
  funded: number;
  closed: number;
  totalRaised: number;
}

export interface IFundingRepository {
  findById(id: string): Promise<FundingRequest | null>;
  findByIdAdmin(id: string): Promise<FundingRequest | null>;
  findAllByOrganizationId(organizationId: string): Promise<FundingRequest[]>;
  findAllPublished(filters?: { category?: string; search?: string }): Promise<FundingRequest[]>;
  findAllForAdmin(filters?: FundingAdminFilters): Promise<{ data: any[]; total: number }>;
  getAdminStats(): Promise<FundingAdminStats>;
  create(data: CreateFundingRequestData): Promise<FundingRequest>;
  updateStatus(
    id: string,
    status: FundingRequest['status'],
    rejectionReason?: string,
  ): Promise<FundingRequest>;
  update(id: string, data: UpdateFundingRequestData): Promise<FundingRequest>;
  delete(id: string): Promise<FundingRequest>;
  disburse(id: string, adminId: string): Promise<FundingRequest>;
}
