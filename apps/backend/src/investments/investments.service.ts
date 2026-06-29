import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvestmentsRepository } from './investments.repository';
import { FundingRepository } from '../funding/funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { SettleInvestmentDto } from './dto/settle-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    private investmentsRepository: InvestmentsRepository,
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
    private notificationsService: NotificationsService,
  ) {}

  async createNegotiation(dto: CreateInvestmentDto, investorId: string) {
    const investment = await this.investmentsRepository.createNegotiation(
      dto.fundingRequestId,
      investorId,
      dto.amountCommitted,
      dto.proposedReturn,
    );

    const fundingRequest = await this.fundingRepository.findById(dto.fundingRequestId);
    if (fundingRequest) {
      const owner = await this.fundingRepository.findOrganizationOwner(fundingRequest.organizationId);
      if (owner) {
        this.notificationsService
          .notify(
            owner.userId,
            'Nouvelle proposition de négociation',
            `Un investisseur propose un taux de ${dto.proposedReturn}% sur "${fundingRequest.title}".`,
          )
          .catch(() => {});
      }
    }

    return investment;
  }

  async counterOffer(investmentId: string, proposedReturn: number, userId: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) throw new NotFoundException('Engagement introuvable.');
    const actingAs = await this.resolveActingRole(investment, userId);
    return this.investmentsRepository.counterOffer(investmentId, actingAs, proposedReturn);
  }

  async acceptOffer(investmentId: string, userId: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) throw new NotFoundException('Engagement introuvable.');
    const actingAs = await this.resolveActingRole(investment, userId);
    return this.investmentsRepository.acceptOffer(investmentId, actingAs);
  }

  private async resolveActingRole(
    investment: { investorId: string; fundingRequestId: string },
    userId: string,
  ): Promise<'INVESTOR' | 'PME'> {
    if (investment.investorId === userId) return 'INVESTOR';

    const fundingRequest = await this.fundingRepository.findById(investment.fundingRequestId);
    if (fundingRequest) {
      const isMember = await this.organizationsRepository.isMember(
        fundingRequest.organizationId,
        userId,
      );
      if (isMember) return 'PME';
    }

    throw new ForbiddenException("Vous n'êtes pas partie à cette négociation.");
  }

  async findMine(investorId: string) {
    return this.investmentsRepository.findAllByInvestorId(investorId);
  }

  async findAllForFundingRequest(fundingRequestId: string) {
    return this.investmentsRepository.findAllByFundingRequestId(fundingRequestId);
  }

  async findAllForOrganization(organizationId: string, userId: string) {
    const isMember = await this.organizationsRepository.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }
    return this.investmentsRepository.findAllForOrganization(organizationId);
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
