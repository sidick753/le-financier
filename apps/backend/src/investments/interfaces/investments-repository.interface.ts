import { Investment } from '@le-financier/database';

export interface IInvestmentsRepository {
  findById(id: string): Promise<Investment | null>;
  findAllByFundingRequestId(fundingRequestId: string): Promise<Investment[]>;
  findAllByInvestorId(investorId: string): Promise<Investment[]>;
  sumActiveCommitments(fundingRequestId: string): Promise<number>;
  create(fundingRequestId: string, investorId: string, amountCommitted: number): Promise<Investment>;
  findAllForOrganization(organizationId: string): Promise<any[]>;
  settle(investmentId: string, settlementProofId: string): Promise<Investment>;
}
