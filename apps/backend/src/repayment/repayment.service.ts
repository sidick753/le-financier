import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { RepaymentRepository } from './repayment.repository';
import { FundingRepository } from '../funding/funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Injectable()
export class RepaymentService {
  constructor(
    private repaymentRepository: RepaymentRepository,
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
    private notificationsService: NotificationsService,
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
    return this.repaymentRepository.findUpcomingByInvestorId(investorId);
  }

  async getScheduleForFundingRequest(fundingRequestId: string) {
    return this.repaymentRepository.findScheduleByFundingRequestId(fundingRequestId);
  }

  async getMyPayments(investorId: string) {
    return this.repaymentRepository.findPaymentsByInvestorId(investorId);
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
      dto.proofDocumentId,
    );

    await this.notificationsService.notifyAdmins(
      'Preuve de remboursement à valider',
      `Une preuve de remboursement a été soumise sur "${fundingRequest.title}".`,
    );

    return payment;
  }

  // [ADMIN] Valide la preuve : paiement confirmé, échéance soldée, reversement net
  // à l'investisseur effectué dans le même geste (voir repayment.repository.approvePayment).
  async approvePayment(paymentId: string, adminId: string) {
    const payment = await this.repaymentRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundException('Paiement introuvable.');
    }
    if (payment.status !== 'PENDING_VALIDATION') {
      throw new BadRequestException("Ce paiement n'est pas en attente de validation.");
    }

    const approved = await this.repaymentRepository.approvePayment(paymentId, adminId);

    await this.notificationsService.notify(
      payment.repaymentSchedule.investment.investorId,
      'Remboursement reçu',
      `Un remboursement de ${Number(payment.amountPaid).toLocaleString('fr-FR')} F CFA vous a été reversé.`,
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

    await this.notificationsService.notify(
      payment.confirmedById,
      'Preuve de remboursement rejetée',
      `Votre preuve de remboursement a été rejetée : ${reason}`,
    );

    return rejected;
  }

  async getPendingPayments() {
    return this.repaymentRepository.findPendingPayments();
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
