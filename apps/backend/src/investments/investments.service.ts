import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvestmentsRepository } from './investments.repository';
import { FundingRepository } from '../funding/funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { RepaymentService } from '../repayment/repayment.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { SettleInvestmentDto } from './dto/settle-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    private investmentsRepository: InvestmentsRepository,
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
    private notificationsService: NotificationsService,
    private repaymentService: RepaymentService,
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
      const owner = await this.fundingRepository.findOrganizationOwner(
        fundingRequest.organizationId,
      );
      if (owner) {
        await this.notificationsService.notify(
          owner.userId,
          "Nouvelle proposition d'investissement",
          `Un investisseur propose ${dto.amountCommitted.toLocaleString('fr-FR')} F CFA à ${dto.proposedReturn}% sur "${fundingRequest.title}".`,
        );
      }
    }

    return investment;
  }

  async counterOffer(investmentId: string, proposedReturn: number, userId: string, userRole: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) throw new NotFoundException('Engagement introuvable.');

    const actingAs = await this.resolveActingRole(investment, userId, userRole);
    const updated = await this.investmentsRepository.counterOffer(
      investmentId,
      actingAs,
      proposedReturn,
    ) as any;

    const pmeOwnerId = updated?.fundingRequest?.organization?.members?.[0]?.userId;
    const investorId = updated?.investor?.id;
    const investorName = `${updated?.investor?.firstName} ${updated?.investor?.lastName}`;
    const orgName = updated?.fundingRequest?.organization?.legalName;
    const requestTitle = updated?.fundingRequest?.title;

    if (actingAs === 'INVESTOR' && pmeOwnerId) {
      await this.notificationsService.notify(
        pmeOwnerId,
        'Nouvelle contre-proposition reçue',
        `${investorName} contre-propose ${proposedReturn}% sur "${requestTitle}".`,
      );
    } else if (actingAs === 'PME' && investorId) {
      await this.notificationsService.notify(
        investorId,
        'Réponse de la PME reçue',
        `${orgName} contre-propose ${proposedReturn}% sur votre engagement.`,
      );
    }

    return updated;
  }

  async acceptOffer(investmentId: string, userId: string, userRole: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) throw new NotFoundException('Engagement introuvable.');

    const actingAs = await this.resolveActingRole(investment, userId, userRole);
    const updated = await this.investmentsRepository.acceptOffer(investmentId, actingAs) as any;

    const pmeOwnerId = updated?.fundingRequest?.organization?.members?.[0]?.userId;
    const investorId = updated?.investor?.id;
    const orgName = updated?.fundingRequest?.organization?.legalName;
    const requestTitle = updated?.fundingRequest?.title;
    const lockedReturn = Number(updated?.lockedReturn);

    if (actingAs === 'INVESTOR' && pmeOwnerId) {
      await this.notificationsService.notify(
        pmeOwnerId,
        "Offre acceptée par l'investisseur",
        `L'investisseur a accepté ${lockedReturn}% sur "${requestTitle}". L'engagement est confirmé.`,
      );
    } else if (actingAs === 'PME' && investorId) {
      await this.notificationsService.notify(
        investorId,
        'Offre acceptée par la PME',
        `${orgName} a accepté ${lockedReturn}% sur votre engagement. Vous êtes maintenant engagé.`,
      );
    }

    return updated;
  }

  private async resolveActingRole(
    investment: { investorId: string; fundingRequestId: string },
    userId: string,
    _userRole?: string,
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

  async findMyEngagement(fundingRequestId: string, investorId: string) {
    return this.investmentsRepository.findByFundingRequestAndInvestor(fundingRequestId, investorId);
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

    const settled = await this.investmentsRepository.settle(investmentId, dto.settlementProofId);

    const fundingRequest = await this.fundingRepository.findById(investment.fundingRequestId) as any;
    if (fundingRequest && investment.lockedReturn && fundingRequest.durationMonths) {
      await this.repaymentService.generateSchedule({
        investmentId,
        fundingRequestId: investment.fundingRequestId,
        amountCommitted: Number(investment.amountCommitted),
        lockedReturn: Number(investment.lockedReturn),
        durationMonths: fundingRequest.durationMonths,
        category: fundingRequest.category,
      });
    }

    return settled;
  }
}
