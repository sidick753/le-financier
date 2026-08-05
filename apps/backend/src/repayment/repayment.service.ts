import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { RepaymentRepository } from './repayment.repository';
import { FundingRepository } from '../funding/funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { UsersRepository } from '../users/users.repository';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';

// PME : fiche de la demande, où l'échéancier de remboursement est visible.
const pmeFundingRequestLink = (fundingRequestId: string) => `${FRONTEND_URL}/dashboard/demandes/${fundingRequestId}`;

// Admin : file d'attente des remboursements/réclamations à valider.
const adminRepaymentsLink = () => `${FRONTEND_URL}/admin/remboursements`;

// Investisseur : portefeuille, où le remboursement disponible peut être réclamé.
const investorPortfolioLink = (role: string | undefined) =>
  `${FRONTEND_URL}${role === 'INSTITUTION' ? '/institution/portefeuille' : '/investor/portefeuille'}`;

@Injectable()
export class RepaymentService {
  constructor(
    private repaymentRepository: RepaymentRepository,
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
    private notificationsService: NotificationsService,
    private institutionsService: InstitutionsService,
    private usersRepository: UsersRepository,
  ) {}

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
    const investorIds = await this.institutionsService.getFellowMemberUserIds(investorId);
    return this.repaymentRepository.findUpcomingByInvestorIds(investorIds);
  }

  // PME (organisation propriétaire) ou admin — jusqu'ici sans contrôle d'accès
  // du tout puisqu'inutilisé par le frontend ; on le sécurise en même temps
  // qu'on lui trouve un premier appelant réel (échéancier PME).
  async getScheduleForFundingRequest(fundingRequestId: string, userId: string, userRole: string) {
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isAdmin) {
      const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
      if (!fundingRequest) {
        throw new NotFoundException('Demande de financement introuvable.');
      }
      const isMember = await this.organizationsRepository.isMember(fundingRequest.organizationId, userId);
      if (!isMember) {
        throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
      }
    }
    return this.repaymentRepository.findScheduleByFundingRequestId(fundingRequestId);
  }

  // Échéancier détaillé d'un investissement précis — réservé à l'investisseur
  // propriétaire (vue "évolution" sur sa page portefeuille).
  async getScheduleForInvestment(investmentId: string, investorId: string) {
    const owner = await this.repaymentRepository.findInvestmentOwner(investmentId);
    if (!owner) {
      throw new NotFoundException('Investissement introuvable.');
    }
    const authorized = await this.institutionsService.isSameInstitutionMember(
      owner.investorId,
      investorId,
    );
    if (!authorized) {
      throw new ForbiddenException("Vous n'avez pas accès à cet investissement.");
    }
    return this.repaymentRepository.findScheduleByInvestmentId(investmentId);
  }

  async getMyPayments(investorId: string) {
    const investorIds = await this.institutionsService.getFellowMemberUserIds(investorId);
    return this.repaymentRepository.findPaymentsByInvestorIds(investorIds);
  }

  // Soumission par la PME : preuve du virement fait vers le compte plateforme,
  // en attente de validation admin. Réservé aux membres de l'organisation propriétaire.
  async confirmPayment(scheduleId: string, dto: ConfirmPaymentDto, userId: string) {
    const schedule = await this.repaymentRepository.findScheduleById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Échéance introuvable.');
    }

    const fundingRequest = await this.fundingRepository.findById(schedule.fundingRequestId);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    const isMember = await this.organizationsRepository.isMember(
      fundingRequest.organizationId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette échéance.");
    }

    const payment = await this.repaymentRepository.confirmPayment(
      scheduleId,
      userId,
      dto.amount,
      dto.proofDocumentId,
    );

    await this.notificationsService.notifyAdmins(
      'Preuve de remboursement à valider',
      `Une preuve de remboursement a été soumise sur "${fundingRequest.title}".`,
      adminRepaymentsLink(),
      { email: true, ctaLabel: 'Valider la preuve' },
    );

    return payment;
  }

  // [ADMIN] Valide la preuve d'une tranche : le montant devient disponible sur le
  // compte plateforme. L'investisseur doit ensuite le réclamer (voir requestClaim) —
  // il peut le faire dès maintenant, sans attendre que l'échéance soit intégralement
  // soldée (voir repayment.repository.approvePayment).
  async approvePayment(paymentId: string, adminId: string) {
    const payment = await this.repaymentRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException('Paiement introuvable.');
    }
    if (payment.status !== 'PENDING_VALIDATION') {
      throw new BadRequestException("Ce paiement n'est pas en attente de validation.");
    }

    const approved = await this.repaymentRepository.approvePayment(paymentId, adminId);

    const investorId = payment.repaymentSchedule.investment.investorId;
    const investorUser = await this.usersRepository.findById(investorId);
    const investorIds = await this.institutionsService.getFellowMemberUserIds(investorId);
    await this.notificationsService.notifyMany(
      investorIds,
      'Remboursement validé',
      `Un remboursement de ${Number(payment.amountPaid).toLocaleString('fr-FR')} F CFA a été validé et est disponible à la réclamation (commission plateforme de 3% déduite au versement).`,
      investorPortfolioLink(investorUser?.role),
      { email: true, ctaLabel: 'Réclamer ce remboursement' },
    );

    return approved;
  }

  // [ADMIN] Rejette la preuve : la PME doit resoumettre.
  async rejectPayment(paymentId: string, adminId: string, reason: string) {
    const payment = await this.repaymentRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException('Paiement introuvable.');
    }
    if (payment.status !== 'PENDING_VALIDATION') {
      throw new BadRequestException("Ce paiement n'est pas en attente de validation.");
    }

    const rejected = await this.repaymentRepository.rejectPayment(paymentId, adminId, reason);

    // Toute l'équipe PME doit savoir, pas seulement le membre qui a confirmé le
    // paiement — n'importe quel membre peut ensuite resoumettre une preuve.
    const fundingRequest = await this.fundingRepository.findById(payment.repaymentSchedule.fundingRequestId);
    const memberIds = fundingRequest
      ? await this.organizationsRepository.findAllMemberUserIds(fundingRequest.organizationId)
      : [payment.confirmedById];
    await this.notificationsService.notifyMany(
      memberIds,
      'Preuve de remboursement rejetée',
      `Votre preuve de remboursement a été rejetée : ${reason}. Merci de resoumettre une preuve valide.`,
      pmeFundingRequestLink(payment.repaymentSchedule.fundingRequestId),
      { email: true, ctaLabel: 'Resoumettre ma preuve' },
    );

    return rejected;
  }

  async getPendingPayments() {
    return this.repaymentRepository.findPendingPayments();
  }

  async getClaimableAmount(scheduleId: string, investorId: string) {
    const owner = await this.repaymentRepository.findScheduleInvestor(scheduleId);
    if (!owner) {
      throw new NotFoundException('Échéance introuvable.');
    }
    const authorized = await this.institutionsService.isSameInstitutionMember(owner.investorId, investorId);
    if (!authorized) {
      throw new ForbiddenException("Vous n'avez pas accès à cette échéance.");
    }
    return this.repaymentRepository.getClaimableAmountForSchedule(scheduleId);
  }

  async getClaimsForSchedule(scheduleId: string, investorId: string) {
    const owner = await this.repaymentRepository.findScheduleInvestor(scheduleId);
    if (!owner) {
      throw new NotFoundException('Échéance introuvable.');
    }
    const authorized = await this.institutionsService.isSameInstitutionMember(owner.investorId, investorId);
    if (!authorized) {
      throw new ForbiddenException("Vous n'avez pas accès à cette échéance.");
    }
    return this.repaymentRepository.findClaimsForSchedule(scheduleId);
  }

  // Investisseur : réclame tout ou partie des remboursements déjà validés sur une
  // échéance, avant même qu'elle soit intégralement soldée. requestedById = la personne
  // qui clique (traçabilité) ; l'autorisation porte sur toute l'institution (voir
  // RepaymentRepository.requestRepaymentClaim).
  async requestClaim(scheduleId: string, requestedById: string, amount?: number) {
    const investorIds = await this.institutionsService.getFellowMemberUserIds(requestedById);
    const claim = await this.repaymentRepository.requestRepaymentClaim(
      scheduleId,
      requestedById,
      investorIds,
      amount,
    );

    await this.notificationsService.notifyAdmins(
      'Réclamation de remboursement à valider',
      `Un investisseur réclame ${Number(claim.amountRequested).toLocaleString('fr-FR')} F CFA sur une échéance de remboursement.`,
      adminRepaymentsLink(),
      { email: true, ctaLabel: 'Valider la réclamation' },
    );

    return claim;
  }

  // [ADMIN] Valide la réclamation et verse le net à l'investisseur.
  async approveClaim(claimId: string, adminId: string, proofDocumentId: string, paidAt: string) {
    const approved = await this.repaymentRepository.approveRepaymentClaim(claimId, adminId, proofDocumentId, paidAt);

    const requester = await this.usersRepository.findById(approved.requestedById);
    const investorIds = await this.institutionsService.getFellowMemberUserIds(approved.requestedById);
    await this.notificationsService.notifyMany(
      investorIds,
      'Réclamation de remboursement validée',
      `Votre réclamation de ${Number(approved.amountRequested).toLocaleString('fr-FR')} F CFA a été validée et versée, net de la commission plateforme de 3% : ${Number(approved.amountNet).toLocaleString('fr-FR')} F CFA.`,
      investorPortfolioLink(requester?.role),
      { email: true, ctaLabel: 'Voir mon portefeuille' },
    );

    return approved;
  }

  // [ADMIN] Rejette la réclamation.
  async rejectClaim(claimId: string, adminId: string, reason: string) {
    const rejected = await this.repaymentRepository.rejectRepaymentClaim(claimId, adminId, reason);

    const requester = await this.usersRepository.findById(rejected.requestedById);
    const investorIds = await this.institutionsService.getFellowMemberUserIds(rejected.requestedById);
    await this.notificationsService.notifyMany(
      investorIds,
      'Réclamation de remboursement rejetée',
      `Votre réclamation a été rejetée : ${reason}`,
      investorPortfolioLink(requester?.role),
      { email: true, ctaLabel: 'Voir mon portefeuille' },
    );

    return rejected;
  }

  async getPendingClaims() {
    return this.repaymentRepository.findPendingRepaymentClaims();
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
