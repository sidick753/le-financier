export interface IRepaymentRepository {
  generateScheduleForInvestment(params: {
    investmentId: string;
    fundingRequestId: string;
    amountCommitted: number;
    lockedReturn: number;
    durationMonths: number;
    category: string;
  }): Promise<void>;
  findScheduleByInvestmentId(investmentId: string): Promise<any[]>;
  findScheduleByFundingRequestId(fundingRequestId: string): Promise<any[]>;
  findUpcomingByInvestorId(investorId: string, limit?: number): Promise<any[]>;
  confirmPayment(scheduleId: string, userId: string, proofDocumentId?: string): Promise<any>;
  findPaymentsByInvestorId(investorId: string): Promise<any[]>;
  findCommissionsByFundingRequestId(fundingRequestId: string): Promise<any[]>;
  findAllCommissions(): Promise<any[]>;
}
