import { FundingRequest } from '@le-financier/database';

export interface CreateFundingRequestData {
  organizationId: string;
  title: string;
  description: string;
  amountRequested: number;
  expectedReturn?: number;
  durationMonths?: number;
}

export interface IFundingRepository {
  findById(id: string): Promise<FundingRequest | null>;
  findAllByOrganizationId(organizationId: string): Promise<FundingRequest[]>;
  findAllPublished(): Promise<FundingRequest[]>;
  create(data: CreateFundingRequestData): Promise<FundingRequest>;
  updateStatus(id: string, status: FundingRequest['status']): Promise<FundingRequest>;
}
