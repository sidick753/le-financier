import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvestmentsRepository } from './investments.repository';
import { FundingRepository } from '../funding/funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { RepaymentService } from '../repayment/repayment.service';
import { InstitutionsService } from '../institutions/institutions.service';
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
    private institutionsService: InstitutionsService,
  ) {}

  async createNegotiation(dto: CreateInvestmentDto, investorId: string) {
    const investment = await this.investmentsRepository.createNegotiation(
      dto.fundingRequestId,
      investorId,
      dto.amountCommitted,
      dto.proposedReturn,
      dto.conditions,
      dto.note,
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

  async counterOffer(investmentId: string, proposedReturn: number, userId: string, userRole: string, conditions?: string, note?: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) throw new NotFoundException('Engagement introuvable.');

    const actingAs = await this.resolveActingRole(investment, userId, userRole);
    const updated = await this.investmentsRepository.counterOffer(
      investmentId,
      actingAs,
      proposedReturn,
      conditions,
      note,
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

  async rejectOffer(investmentId: string, userId: string, userRole: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) throw new NotFoundException('Engagement introuvable.');

    const actingAs = await this.resolveActingRole(investment, userId, userRole);
    const updated = await this.investmentsRepository.rejectOffer(investmentId, actingAs) as any;

    const pmeOwnerId = updated?.fundingRequest?.organization?.members?.[0]?.userId;
    const investorId = updated?.investor?.id;
    const orgName = updated?.fundingRequest?.organization?.legalName;
    const requestTitle = updated?.fundingRequest?.title;

    if (actingAs === 'INVESTOR' && pmeOwnerId) {
      await this.notificationsService.notify(
        pmeOwnerId,
        "Négociation abandonnée par l'investisseur",
        `L'investisseur a mis fin à la négociation sur "${requestTitle}".`,
      );
    } else if (actingAs === 'PME' && investorId) {
      await this.notificationsService.notify(
        investorId,
        'Négociation abandonnée par la PME',
        `${orgName} a mis fin à la négociation sur votre engagement "${requestTitle}".`,
      );
    }

    return updated;
  }

  private async resolveActingRole(
    investment: { investorId: string; fundingRequestId: string },
    userId: string,
    _userRole?: string,
  ): Promise<'INVESTOR' | 'PME'> {
    if (await this.institutionsService.isSameInstitutionMember(investment.investorId, userId)) {
      return 'INVESTOR';
    }

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

  // Institution-aware comme findMine/resolveActingRole : un collègue doit retrouver
  // la négociation engagée par un autre membre de son institution sur ce même deal,
  // pas voir un formulaire vide qui l'inviterait à en créer une seconde par erreur.
  async findMyEngagement(fundingRequestId: string, investorId: string) {
    const investorIds = await this.institutionsService.getFellowMemberUserIds(investorId);
    return this.investmentsRepository.findByFundingRequestAndInvestors(fundingRequestId, investorId, investorIds);
  }

  // Portefeuille de l'institution du membre courant (ou juste lui-même si
  // investisseur indépendant) — un dossier engagé par un collègue appartient à
  // l'institution, pas à la personne qui a cliqué (voir InstitutionsService).
  async findMine(investorId: string) {
    const investorIds = await this.institutionsService.getFellowMemberUserIds(investorId);
    return this.investmentsRepository.findAllByInvestorIds(investorIds);
  }

  // Nombre d'engagements où la dernière offre vient de la PME et attend une réponse
  // de l'investisseur — sert de badge "à traiter" côté institution/investisseur.
  async getMyPendingCount(investorId: string) {
    const investorIds = await this.institutionsService.getFellowMemberUserIds(investorId);
    const investments = await this.investmentsRepository.findAllByInvestorIds(investorIds);
    return investments.filter((inv: any) => {
      const last = inv.negotiationOffers[0];
      return last?.proposedBy === 'PME' && last?.status === 'PENDING';
    }).length;
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

  // Nombre d'engagements où la dernière offre vient de l'investisseur et attend une
  // réponse de la PME — sert de badge "à traiter" côté PME (Offres reçues).
  async getPendingCountForOrganization(organizationId: string, userId: string) {
    const isMember = await this.organizationsRepository.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }
    const investments = await this.investmentsRepository.findAllForOrganization(organizationId);
    return investments.filter((inv: any) => {
      const last = inv.negotiationOffers[0];
      return last?.proposedBy === 'INVESTOR' && last?.status === 'PENDING';
    }).length;
  }

  // Soumission par l'investisseur — dépose une preuve, notifie les admins pour validation.
  // Ne génère pas encore l'échéancier de remboursement : on ne sait pas encore si le
  // virement est réel, ça viendra à la validation admin (approveSettlement).
  async settle(investmentId: string, dto: SettleInvestmentDto, investorId: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) {
      throw new NotFoundException('Engagement introuvable.');
    }

    const authorized = await this.institutionsService.isSameInstitutionMember(
      investment.investorId,
      investorId,
    );
    if (!authorized) {
      throw new ForbiddenException('Vous ne pouvez confirmer que les engagements de votre institution.');
    }

    const submitted = await this.investmentsRepository.settle(investmentId, dto.settlementProofId);

    const fundingRequest = await this.fundingRepository.findById(investment.fundingRequestId);
    await this.notificationsService.notifyAdmins(
      'Preuve de virement à valider',
      `Une preuve de virement de ${Number(investment.amountCommitted).toLocaleString('fr-FR')} F CFA a été soumise sur "${fundingRequest?.title ?? 'une demande'}".`,
    );

    return submitted;
  }

  // [ADMIN] Valide la preuve : engagement confirmé, échéancier de remboursement généré,
  // et FundingRequest.amountRaised/status recalculés (voir investments.repository.approveSettlement).
  async approveSettlement(investmentId: string, adminId: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) {
      throw new NotFoundException('Engagement introuvable.');
    }

    const approved = await this.investmentsRepository.approveSettlement(investmentId, adminId);

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

    if (fundingRequest?.organization) {
      await this.institutionsService.evaluateInvestmentSettlement({
        investorId: investment.investorId,
        amountCommitted: Number(investment.amountCommitted),
        organization: fundingRequest.organization,
      });
    }

    await this.notificationsService.notify(
      investment.investorId,
      'Virement validé',
      `Votre virement de ${Number(investment.amountCommitted).toLocaleString('fr-FR')} F CFA sur "${fundingRequest?.title ?? 'une demande'}" a été validé.`,
    );

    return approved;
  }

  // [ADMIN] Rejette la preuve : l'investisseur retombe en COMMITTED et doit resoumettre.
  async rejectSettlement(investmentId: string, adminId: string, reason: string) {
    const investment = await this.investmentsRepository.findById(investmentId);
    if (!investment) {
      throw new NotFoundException('Engagement introuvable.');
    }

    const rejected = await this.investmentsRepository.rejectSettlement(investmentId, adminId, reason);

    const fundingRequest = await this.fundingRepository.findById(investment.fundingRequestId);
    await this.notificationsService.notify(
      investment.investorId,
      'Preuve de virement rejetée',
      `Votre preuve de virement sur "${fundingRequest?.title ?? 'une demande'}" a été rejetée : ${reason}`,
    );

    return rejected;
  }
}
