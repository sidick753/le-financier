import { Injectable } from '@nestjs/common';
import { RepaymentRepository } from './repayment.repository';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Injectable()
export class RepaymentService {
  constructor(private repaymentRepository: RepaymentRepository) {}

  async generateSchedule(params: {
    investmentId: string;
    fundingRequestId: string;
    amountCommitted: number;
    lockedReturn: number;
    durationMonths: number;
    category: string;
  }) {
    await this.repaymentRepository.generateScheduleForInvestment(params);
  }

  async getMySchedule(investorId: string) {
    return this.repaymentRepository.findUpcomingByInvestorId(investorId);
  }

  async getScheduleForFundingRequest(fundingRequestId: string) {
    return this.repaymentRepository.findScheduleByFundingRequestId(fundingRequestId);
  }

  async getMyPayments(investorId: string) {
    return this.repaymentRepository.findPaymentsByInvestorId(investorId);
  }

  async confirmPayment(scheduleId: string, dto: ConfirmPaymentDto, userId: string) {
    return this.repaymentRepository.confirmPayment(scheduleId, userId, dto.proofDocumentId);
  }

  async getAllCommissions(filters?: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.repaymentRepository.findAllCommissions(filters);
  }

  async getCommissionStats() {
    return this.repaymentRepository.getCommissionStats();
  }

  async getTopOrganizations() {
    return this.repaymentRepository.getTopOrganizations();
  }
}
