import { Investment } from '@le-financier/database';

export interface IInvestmentsRepository {
  findById(id: string): Promise<Investment | null>;
  findAllByFundingRequestId(fundingRequestId: string): Promise<Investment[]>;
  findAllByInvestorId(investorId: string): Promise<any[]>;
  sumActiveCommitments(fundingRequestId: string): Promise<number>;
  createNegotiation(fundingRequestId: string, investorId: string, amountCommitted: number, proposedReturn: number): Promise<Investment>;
  counterOffer(investmentId: string, proposedBy: 'INVESTOR' | 'PME', proposedReturn: number): Promise<Investment | null>;
  acceptOffer(investmentId: string, acceptedBy: 'INVESTOR' | 'PME'): Promise<Investment>;
  findAllForOrganization(organizationId: string): Promise<any[]>;
  settle(investmentId: string, settlementProofId: string): Promise<Investment>;
}
