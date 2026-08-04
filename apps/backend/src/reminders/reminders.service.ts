import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RepaymentRepository } from '../repayment/repayment.repository';
import { FundingRepository } from '../funding/funding.repository';
import { NotificationsService } from '../notifications/notifications.service';

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';
const REMINDER_DAYS_BEFORE_DUE = 3;
const STALE_UNDER_REVIEW_DAYS = 3;

const pmeFundingRequestLink = (fundingRequestId: string) => `${FRONTEND_URL}/dashboard/demandes/${fundingRequestId}`;
const adminOpportunityLink = (fundingRequestId: string) => `${FRONTEND_URL}/admin/opportunites/${fundingRequestId}`;

// Rappels programmés — jusqu'ici inexistants : aucun cron ne tournait sur le
// backend. Les trois cas ci-dessous sont les seuls "manque" de la catégorie
// rappels identifiés comme légitimes (échéance à venir/en retard, backlog admin) ;
// chacun est conçu pour ne notifier qu'une fois par événement (voir les commentaires
// des requêtes dans RepaymentRepository/FundingRepository), pas en boucle chaque jour.
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private repaymentRepository: RepaymentRepository,
    private fundingRepository: FundingRepository,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyReminders() {
    await Promise.all([
      this.remindUpcomingRepayments().catch((err) =>
        this.logger.error('Erreur rappel échéances à venir', err),
      ),
      this.flagOverdueRepayments().catch((err) =>
        this.logger.error('Erreur signalement échéances en retard', err),
      ),
      this.remindStaleFundingReviews().catch((err) =>
        this.logger.error('Erreur relance dossiers en révision', err),
      ),
    ]);
  }

  // PME : rappel J-3 avant une échéance de remboursement due, pour éviter un
  // retard évitable faute d'y avoir pensé.
  private async remindUpcomingRepayments() {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + REMINDER_DAYS_BEFORE_DUE);

    const schedules = await this.repaymentRepository.findSchedulesDueOnDate(targetDate);
    for (const schedule of schedules as any[]) {
      const fundingRequest = schedule.fundingRequest;
      if (!fundingRequest) continue;
      const owner = await this.fundingRepository.findOrganizationOwner(fundingRequest.organizationId);
      if (!owner) continue;

      await this.notificationsService.notify(
        owner.userId,
        'Échéance de remboursement dans 3 jours',
        `Une échéance de ${Number(schedule.amountDue).toLocaleString('fr-FR')} F CFA arrive à terme le ${schedule.dueDate.toLocaleDateString('fr-FR')} sur "${fundingRequest.title}".`,
        pmeFundingRequestLink(fundingRequest.id),
        { email: true, ctaLabel: 'Voir ma demande' },
      );
    }
  }

  // PME + admin : bascule les échéances dépassées en OVERDUE et alerte les deux
  // côtés — la PME doit régulariser, l'admin doit suivre le risque d'impayé.
  private async flagOverdueRepayments() {
    const overdue = await this.repaymentRepository.markOverdueSchedules();
    for (const schedule of overdue as any[]) {
      const fundingRequest = schedule.fundingRequest;
      if (!fundingRequest) continue;

      const owner = await this.fundingRepository.findOrganizationOwner(fundingRequest.organizationId);
      if (owner) {
        await this.notificationsService.notify(
          owner.userId,
          'Échéance de remboursement en retard',
          `Une échéance de ${Number(schedule.amountDue).toLocaleString('fr-FR')} F CFA sur "${fundingRequest.title}" est en retard depuis le ${schedule.dueDate.toLocaleDateString('fr-FR')}. Merci de régulariser au plus vite.`,
          pmeFundingRequestLink(fundingRequest.id),
          { email: true, ctaLabel: 'Régulariser' },
        );
      }

      await this.notificationsService.notifyAdmins(
        'Échéance de remboursement en retard',
        `"${fundingRequest.title}" a une échéance de ${Number(schedule.amountDue).toLocaleString('fr-FR')} F CFA en retard depuis le ${schedule.dueDate.toLocaleDateString('fr-FR')}.`,
        adminOpportunityLink(fundingRequest.id),
        { email: true, ctaLabel: 'Voir le dossier' },
      );
    }
  }

  // Admin : relance sur les dossiers UNDER_REVIEW qui stagnent depuis
  // STALE_UNDER_REVIEW_DAYS jours sans décision (approbation/rejet).
  private async remindStaleFundingReviews() {
    const stale = await this.fundingRepository.findStaleUnderReview(STALE_UNDER_REVIEW_DAYS);
    for (const fundingRequest of stale) {
      await this.notificationsService.notifyAdmins(
        'Dossier en révision depuis plusieurs jours',
        `"${fundingRequest.title}" attend une décision depuis plus de ${STALE_UNDER_REVIEW_DAYS} jours.`,
        adminOpportunityLink(fundingRequest.id),
        { email: true, ctaLabel: 'Examiner le dossier' },
      );
    }
  }
}
