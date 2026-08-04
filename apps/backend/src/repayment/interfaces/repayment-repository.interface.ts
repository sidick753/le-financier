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
  findInvestmentOwner(investmentId: string): Promise<{ investorId: string } | null>;
  findScheduleByFundingRequestId(fundingRequestId: string): Promise<any[]>;
  findScheduleById(scheduleId: string): Promise<any | null>;
  findUpcomingByInvestorIds(investorIds: string[], limit?: number): Promise<any[]>;
  confirmPayment(scheduleId: string, userId: string, amount?: number, proofDocumentId?: string): Promise<any>;
  findPaymentById(paymentId: string): Promise<any | null>;
  approvePayment(paymentId: string, adminId: string): Promise<any>;
  rejectPayment(paymentId: string, adminId: string, reason: string): Promise<any>;
  findPendingPayments(): Promise<any[]>;
  findPaymentsByInvestorIds(investorIds: string[]): Promise<any[]>;
  findSchedulesDueOnDate(date: Date): Promise<any[]>;
  markOverdueSchedules(): Promise<any[]>;
  getClaimableAmountForSchedule(scheduleId: string): Promise<number>;
  findScheduleInvestor(scheduleId: string): Promise<{ investorId: string } | null>;
  requestRepaymentClaim(
    scheduleId: string,
    requestedById: string,
    authorizedInvestorIds: string[],
    amount?: number,
  ): Promise<any>;
  approveRepaymentClaim(claimId: string, adminId: string, proofDocumentId: string, paidAt: string): Promise<any>;
  rejectRepaymentClaim(claimId: string, adminId: string, reason: string): Promise<any>;
  findClaimsForSchedule(scheduleId: string): Promise<any[]>;
  findPendingRepaymentClaims(): Promise<any[]>;
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
