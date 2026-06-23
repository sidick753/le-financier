import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvestmentsRepository } from './investments.repository';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { SettleInvestmentDto } from './dto/settle-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(private investmentsRepository: InvestmentsRepository) {}

  async create(dto: CreateInvestmentDto, investorId: string) {
    return this.investmentsRepository.create(
      dto.fundingRequestId,
      investorId,
      dto.amountCommitted,
    );
  }

  async findMine(investorId: string) {
    return this.investmentsRepository.findAllByInvestorId(investorId);
  }

  async findAllForFundingRequest(fundingRequestId: string) {
    return this.investmentsRepository.findAllByFundingRequestId(fundingRequestId);
  }

  async settle(investmentId: string, dto: SettleInvestmentDto, investorId: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) {
      throw new NotFoundException('Engagement introuvable.');
    }

    if (investment.investorId !== investorId) {
      throw new ForbiddenException("Vous ne pouvez confirmer que vos propres engagements.");
    }

    return this.investmentsRepository.settle(investmentId, dto.settlementProofId);
  }
}
