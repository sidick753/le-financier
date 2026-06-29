import { FundingRequest, FundingCategory } from '@le-financier/database';

export interface CreateFundingRequestData {
  organizationId: string;
  title: string;
  description: string;
  category: FundingCategory;
  amountRequested: number;
  expectedReturn?: number;
  durationMonths?: number;
}

export interface IFundingRepository {
  findById(id: string): Promise<FundingRequest | null>;
  findAllByOrganizationId(organizationId: string): Promise<FundingRequest[]>;
  findAllPublished(filters?: { category?: string; search?: string }): Promise<FundingRequest[]>;
  create(data: CreateFundingRequestData): Promise<FundingRequest>;
  updateStatus(id: string, status: FundingRequest['status']): Promise<FundingRequest>;
}
