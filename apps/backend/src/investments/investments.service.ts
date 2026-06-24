import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvestmentsRepository } from './investments.repository';
import { FundingRepository } from '../funding/funding.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { SettleInvestmentDto } from './dto/settle-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    private investmentsRepository: InvestmentsRepository,
    private fundingRepository: FundingRepository,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateInvestmentDto, investorId: string) {
    const investment = await this.investmentsRepository.create(
      dto.fundingRequestId,
      investorId,
      dto.amountCommitted,
    );

    const fundingRequest = await this.fundingRepository.findById(dto.fundingRequestId);
    if (fundingRequest?.organization) {
      const owner = await this.fundingRepository.findOrganizationOwner(
        fundingRequest.organizationId,
      );
      if (owner) {
        // Fire-and-forget : une erreur de notification ne doit jamais bloquer la création.
        this.notificationsService
          .notify(
            owner.userId,
            'Nouvel engagement reçu',
            `Un investisseur s'est engagé pour ${dto.amountCommitted} sur "${fundingRequest.title}".`,
          )
          .catch(() => {});
      }
    }

    return investment;
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
      throw new ForbiddenException('Vous ne pouvez confirmer que vos propres engagements.');
    }

    return this.investmentsRepository.settle(investmentId, dto.settlementProofId);
  }
}
