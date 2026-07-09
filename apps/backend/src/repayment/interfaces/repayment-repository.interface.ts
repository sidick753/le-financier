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
  findAllCommissions(filters?: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }>;
  getCommissionStats(): Promise<{
    total: number;
    fundingFees: number;
    interestFees: number;
    thisMonth: number;
    thisMonthVolume: number;
    monthly: Array<{ label: string; commissions: number; volume: number }>;
  }>;
  getTopOrganizations(take?: number): Promise<
    Array<{ id: string; legalName: string; volume: number; commissions: number; operations: number }>
  >;
}
