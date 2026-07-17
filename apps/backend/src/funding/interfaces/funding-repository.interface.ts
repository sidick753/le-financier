import { FundingRequest, FundingCategory, FundingInvestorMode } from '@le-financier/database';

export interface CreateFundingRequestData {
  organizationId: string;
  title: string;
  description: string;
  category: FundingCategory;
  amountRequested: number;
  expectedReturn?: number;
  durationMonths?: number;
  investorMode?: FundingInvestorMode;

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
  investorMode?: FundingInvestorMode;
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
  findAllPublished(filters?: {
    category?: string;
    search?: string;
    sort?: string;
    risk?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }>;
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
  hasActiveInvestor(fundingRequestId: string): Promise<boolean>;
  getClaimableAmount(fundingRequestId: string): Promise<number>;
  requestFundingClaim(fundingRequestId: string, userId: string, amount?: number): Promise<any>;
  approveFundingClaim(claimId: string, adminId: string): Promise<any>;
  rejectFundingClaim(claimId: string, adminId: string, reason: string): Promise<any>;
  findClaimsForFundingRequest(fundingRequestId: string): Promise<any[]>;
  findPendingFundingClaims(): Promise<any[]>;
}
