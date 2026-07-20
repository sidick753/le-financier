import { Investment } from '@le-financier/database';

export interface IInvestmentsRepository {
  findById(id: string): Promise<Investment | null>;
  findAllByFundingRequestId(fundingRequestId: string): Promise<Investment[]>;
  findAllByInvestorIds(investorIds: string[]): Promise<any[]>;
  sumActiveCommitments(fundingRequestId: string): Promise<number>;
  createNegotiation(fundingRequestId: string, investorId: string, amountCommitted: number, proposedReturn: number, conditions?: string, note?: string): Promise<Investment>;
  counterOffer(investmentId: string, proposedBy: 'INVESTOR' | 'PME', proposedReturn: number, conditions?: string, note?: string): Promise<Investment | null>;
  acceptOffer(investmentId: string, acceptedBy: 'INVESTOR' | 'PME'): Promise<Investment>;
  rejectOffer(investmentId: string, rejectedBy: 'INVESTOR' | 'PME'): Promise<Investment>;
  findByFundingRequestAndInvestors(fundingRequestId: string, ownInvestorId: string, investorIds: string[]): Promise<any>;
  findAllForOrganization(organizationId: string): Promise<any[]>;
  settle(investmentId: string, settlementProofId: string): Promise<Investment>;
  approveSettlement(investmentId: string, adminId: string): Promise<Investment>;
  rejectSettlement(investmentId: string, adminId: string, reason: string): Promise<Investment>;
}
