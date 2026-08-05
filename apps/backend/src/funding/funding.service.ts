import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FundingCategory, FundingInvestorMode } from '@le-financier/database';
import { FundingRepository } from './funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ScoringService } from '../scoring/scoring.service';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { PlatformBankAccountsService } from '../platform-bank-accounts/platform-bank-accounts.service';
import { CreateFundingRequestDto } from './dto/create-funding-request.dto';
import { UpdateFundingRequestDto } from './dto/update-funding-request.dto';
import { FundingAdminFilters } from './interfaces/funding-repository.interface';
import { EDITABLE_FUNDING_STATUSES, PUBLIC_FUNDING_STATUSES } from './funding-status.constants';

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';

// PME : fiche de sa propre demande.
const pmeFundingRequestLink = (fundingRequestId: string) => `${FRONTEND_URL}/dashboard/demandes/${fundingRequestId}`;

// Admin : fiche d'opportunité, pour traiter la revue/réclamation concernée.
const adminOpportunityLink = (fundingRequestId: string) => `${FRONTEND_URL}/admin/opportunites/${fundingRequestId}`;

@Injectable()
export class FundingService {
  constructor(
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
    private scoringService: ScoringService,
    private documentsService: DocumentsService,
    private notificationsService: NotificationsService,
    private institutionsService: InstitutionsService,
    private platformBankAccountsService: PlatformBankAccountsService,
  ) {}

  async create(dto: CreateFundingRequestDto, userId: string) {
    const isMember = await this.organizationsRepository.isMember(
      dto.organizationId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException(
        "Vous ne pouvez créer une demande que pour une organisation dont vous êtes membre.",
      );
    }

    return this.fundingRepository.create({
      organizationId: dto.organizationId,
      title: dto.title,
      description: dto.description,
      category: dto.category as FundingCategory,
      amountRequested: dto.amountRequested,
      expectedReturn: dto.expectedReturn,
      durationMonths: dto.durationMonths,
      investorMode: dto.investorMode as FundingInvestorMode | undefined,
      // Scoring FACTURE — ce débiteur, cette facture précise
      debiteurNom: dto.debiteurNom,
      debiteurType: dto.debiteurType,
      debiteurSolvabilite: dto.debiteurSolvabilite,
      echeanceFactureDate: dto.echeanceFactureDate,
      ancienneteRelation: dto.ancienneteRelation,
      partPlusGrosClient: dto.partPlusGrosClient,
      delaiPaiementMenu: dto.delaiPaiementMenu,
      tauxImpaye12m: dto.tauxImpaye12m,
      // Scoring PRET MLT — la garantie offerte pour ce prêt précis
      garantieType: dto.garantieType,
      garantieCouverture: dto.garantieCouverture,
    });
  }

  async update(id: string, dto: UpdateFundingRequestDto, userId: string) {
    const fundingRequest = await this.fundingRepository.findById(id);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    const isMember = await this.organizationsRepository.isMember(
      fundingRequest.organizationId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    }

    if (!EDITABLE_FUNDING_STATUSES.includes(fundingRequest.status)) {
      throw new BadRequestException(
        'Seule une demande non encore publiée peut être modifiée.',
      );
    }

    const updated = await this.fundingRepository.update(id, {
      title: dto.title,
      description: dto.description,
      category: dto.category as FundingCategory,
      amountRequested: dto.amountRequested,
      expectedReturn: dto.expectedReturn,
      durationMonths: dto.durationMonths,
      investorMode: dto.investorMode as FundingInvestorMode | undefined,
    });

    // Le montant/durée/catégorie ont pu changer : si un score a déjà été
    // calculé (demande UNDER_REVIEW), il faut le recalculer pour ne pas
    // laisser l'admin approuver sur la base de chiffres obsolètes.
    if (fundingRequest.status === 'UNDER_REVIEW') {
      this.scoringService.computeAndSave({
        fundingRequestId: id,
        organizationId: updated.organizationId,
        product: updated.category,
        amountRequested: Number(updated.amountRequested),
        durationMonths: updated.durationMonths ?? undefined,
      }).catch((err) => {
        console.error(`[ScoringService] Erreur recalcul scoring ${id}:`, err);
      });
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const fundingRequest = await this.fundingRepository.findById(id);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    const isMember = await this.organizationsRepository.isMember(
      fundingRequest.organizationId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    }

    if (!EDITABLE_FUNDING_STATUSES.includes(fundingRequest.status)) {
      throw new BadRequestException(
        'Seule une demande non encore publiée peut être supprimée.',
      );
    }

    // Les lignes Document sont retirées en cascade par Postgres, mais les
    // fichiers physiques dans l'object storage doivent être nettoyés avant,
    // sans quoi ils restent orphelins indéfiniment.
    await this.documentsService.deleteStorageForFundingRequest(id);

    await this.fundingRepository.delete(id);
    return { success: true };
  }

  async findMineByOrganization(organizationId: string, userId: string) {
    const isMember = await this.organizationsRepository.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }

    return this.fundingRepository.findAllByOrganizationId(organizationId);
  }

  async findOneWithDetails(id: string, userId?: string) {
    const fundingRequest = await this.fundingRepository.findById(id);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    // Calculé dans tous les cas (pas seulement pour les statuts non publics) : une
    // fois PUBLISHED, ce même endpoint sert aussi bien la PME propriétaire (son
    // propre dossier) qu'un investisseur externe — la distinction sert plus bas à
    // ne jamais exposer un score encore auto (non validé par un admin) à ce dernier.
    const isMember = userId
      ? await this.organizationsRepository.isMember(fundingRequest.organizationId, userId)
      : false;

    if (!PUBLIC_FUNDING_STATUSES.includes(fundingRequest.status)) {
      if (!userId) {
        throw new ForbiddenException("Cette demande n'est pas accessible publiquement.");
      }
      if (!isMember) {
        throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
      }
    }

    // Ne concerne que le mode investisseur unique : permet au frontend de bloquer
    // la tentative d'engagement d'un second investisseur *avant* le rejet backend,
    // plutôt que de le laisser cliquer sur un montant affiché comme disponible.
    const hasActiveInvestor =
      fundingRequest.investorMode === 'SINGLE_INVESTOR'
        ? await this.fundingRepository.hasActiveInvestor(id)
        : false;

    // Les coordonnées bancaires de la PME ne doivent JAMAIS être exposées à un
    // investisseur, quel que soit son statut — seul un admin les consulte, pour
    // le décaissement/la réclamation (cf. organizations.controller.ts). Ce que
    // l'investisseur reçoit une fois son engagement confirmé (COMMITTED ou
    // au-delà), c'est le compte bancaire de la plateforme elle-même, vers
    // lequel le virement doit être fait.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omission volontaire via destructuring
    const { bankName, bankAccountHolder, bankAccountNumber, bankSwiftCode, scoringReports: orgScoringReports, ...publicOrganization } =
      fundingRequest.organization;

    const investorIds = userId ? await this.institutionsService.getFellowMemberUserIds(userId) : [];
    const hasCommitted =
      investorIds.length > 0 &&
      (await this.fundingRepository.hasCommittedInvestment(id, investorIds));
    const platformBankAccounts = hasCommitted ? await this.platformBankAccountsService.findActive() : [];

    // Un rapport encore CALCULATED (calcul automatique) ou PENDING_VALIDATION n'a
    // pas été relu par un analyste — jamais servir de base de décision à un
    // investisseur externe. Le membre de l'organisation (son propre dossier, en
    // cours d'instruction) continue de tout voir.
    const scoringReports = isMember
      ? fundingRequest.scoringReports
      : fundingRequest.scoringReports.filter((r) => r.status === 'VALIDATED');
    const orgValidatedScoringReports = isMember
      ? orgScoringReports
      : orgScoringReports.filter((r) => r.status === 'VALIDATED');

    return {
      ...fundingRequest,
      scoringReports,
      organization: { ...publicOrganization, scoringReports: orgValidatedScoringReports },
      hasActiveInvestor,
      platformBankAccounts,
    };
  }

  async findOneAdmin(id: string) {
    const fundingRequest = await this.fundingRepository.findByIdAdmin(id);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }
    return fundingRequest;
  }

  async findAllPublished(filters?: {
    category?: string;
    search?: string;
    sort?: string;
    risk?: string;
    page?: number;
    limit?: number;
  }) {
    return this.fundingRepository.findAllPublished(filters);
  }

  async submitForReview(fundingRequestId: string, userId: string) {
    const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    const isMember = await this.organizationsRepository.isMember(
      fundingRequest.organizationId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    }

    if (fundingRequest.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seule une demande en brouillon peut être soumise pour révision.',
      );
    }

    const updated = await this.fundingRepository.updateStatus(fundingRequestId, 'UNDER_REVIEW');

    // Calcul du score en arrière-plan (non bloquant)
    this.scoringService.computeAndSave({
      fundingRequestId,
      organizationId: fundingRequest.organizationId,
      product: fundingRequest.category,
      amountRequested: Number(fundingRequest.amountRequested),
      durationMonths:  fundingRequest.durationMonths ?? undefined,
    }).catch((err) => {
      console.error(`[ScoringService] Erreur calcul scoring ${fundingRequestId}:`, err);
    });

    await this.notificationsService.notifyAdmins(
      'Nouveau dossier à examiner',
      `"${fundingRequest.title}" a été soumis pour révision.`,
      adminOpportunityLink(fundingRequestId),
      { email: true, ctaLabel: 'Examiner le dossier' },
    );

    return updated;
  }

  async approve(fundingRequestId: string) {
    const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    if (fundingRequest.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        'Seule une demande en révision peut être publiée.',
      );
    }

    // La demande peut avoir un score impeccable, si l'organisation elle-même n'est
    // pas encore vérifiée (KYC/RCCM), la publier reviendrait à présenter aux
    // investisseurs une PME dont l'identité n'a pas été confirmée par un admin.
    if (fundingRequest.organization.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException(
        "L'organisation doit d'abord être vérifiée (KYC) avant de pouvoir publier une de ses demandes.",
      );
    }

    const updated = await this.fundingRepository.updateStatus(fundingRequestId, 'PUBLISHED');

    const memberIds = await this.organizationsRepository.findAllMemberUserIds(fundingRequest.organizationId);
    await this.notificationsService.notifyMany(
      memberIds,
      'Demande publiée',
      `Votre demande "${fundingRequest.title}" a été validée et est maintenant visible par les investisseurs.`,
      pmeFundingRequestLink(fundingRequestId),
      { email: true, ctaLabel: 'Voir ma demande' },
    );

    return updated;
  }

  async reject(fundingRequestId: string, reason: string) {
    const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    if (fundingRequest.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        'Seule une demande en révision peut être rejetée.',
      );
    }

    const updated = await this.fundingRepository.updateStatus(fundingRequestId, 'REJECTED', reason);

    const memberIds = await this.organizationsRepository.findAllMemberUserIds(fundingRequest.organizationId);
    await this.notificationsService.notifyMany(
      memberIds,
      'Demande rejetée',
      `Votre demande "${fundingRequest.title}" a été rejetée : ${reason}`,
      pmeFundingRequestLink(fundingRequestId),
      { email: true, ctaLabel: 'Voir ma demande' },
    );

    return updated;
  }

  async getScoringReport(fundingRequestId: string) {
    const report = await this.scoringService.getReport(fundingRequestId);
    if (!report) {
      throw new NotFoundException('Rapport de scoring non disponible — soumettez d\'abord la demande.');
    }
    return report;
  }

  async findAllForAdmin(filters?: FundingAdminFilters) {
    return this.fundingRepository.findAllForAdmin(filters);
  }

  async getAdminStats() {
    return this.fundingRepository.getAdminStats();
  }

  async cancel(id: string) {
    const fr = await this.fundingRepository.findById(id);
    if (!fr) throw new NotFoundException('Demande introuvable.');
    const updated = await this.fundingRepository.updateStatus(id, 'CANCELLED');

    const memberIds = await this.organizationsRepository.findAllMemberUserIds(fr.organizationId);
    await this.notificationsService.notifyMany(
      memberIds,
      'Demande suspendue',
      `Votre demande "${fr.title}" a été suspendue par un administrateur et n'est plus visible par les investisseurs.`,
      pmeFundingRequestLink(id),
      { email: true, ctaLabel: 'Voir ma demande' },
    );

    return updated;
  }

  async reactivate(id: string) {
    const fr = await this.fundingRepository.findById(id);
    if (!fr) throw new NotFoundException('Demande introuvable.');
    if (fr.status !== 'CANCELLED') {
      throw new BadRequestException('Seule une demande suspendue peut être réactivée.');
    }
    const updated = await this.fundingRepository.updateStatus(id, 'PUBLISHED');

    const memberIds = await this.organizationsRepository.findAllMemberUserIds(fr.organizationId);
    await this.notificationsService.notifyMany(
      memberIds,
      'Demande réactivée',
      `Votre demande "${fr.title}" est de nouveau visible par les investisseurs.`,
      pmeFundingRequestLink(id),
      { email: true, ctaLabel: 'Voir ma demande' },
    );

    return updated;
  }

  // PME : montant déjà validé par un admin mais pas encore réclamé — disponible dès
  // qu'un investissement est validé, pas besoin d'attendre le financement complet.
  async getClaimableAmount(id: string, userId: string) {
    const fundingRequest = await this.fundingRepository.findById(id);
    if (!fundingRequest) throw new NotFoundException('Demande introuvable.');
    const isMember = await this.organizationsRepository.isMember(fundingRequest.organizationId, userId);
    if (!isMember) throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    return this.fundingRepository.getClaimableAmount(id);
  }

  async getClaimsForFundingRequest(id: string, userId: string) {
    const fundingRequest = await this.fundingRepository.findById(id);
    if (!fundingRequest) throw new NotFoundException('Demande introuvable.');
    const isMember = await this.organizationsRepository.isMember(fundingRequest.organizationId, userId);
    if (!isMember) throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    return this.fundingRepository.findClaimsForFundingRequest(id);
  }

  // PME : réclame tout ou partie des fonds déjà validés sur son dossier, avant même
  // qu'il soit intégralement financé.
  async requestClaim(id: string, userId: string, amount?: number) {
    const fundingRequest = await this.fundingRepository.findById(id);
    if (!fundingRequest) throw new NotFoundException('Demande introuvable.');
    const isMember = await this.organizationsRepository.isMember(fundingRequest.organizationId, userId);
    if (!isMember) throw new ForbiddenException("Vous n'avez pas accès à cette demande.");

    const claim = await this.fundingRepository.requestFundingClaim(id, userId, amount);

    await this.notificationsService.notifyAdmins(
      'Réclamation de financement à valider',
      `La PME réclame ${Number(claim.amountRequested).toLocaleString('fr-FR')} F CFA sur "${fundingRequest.title}".`,
      adminOpportunityLink(id),
      { email: true, ctaLabel: 'Valider la réclamation' },
    );

    return claim;
  }

  // Toute l'équipe PME doit être notifiée d'une réclamation traitée, pas seulement
  // le membre qui a cliqué "réclamer" — les fonds appartiennent à l'organisation.
  private async notifyOrganizationOfFundingRequest(
    fundingRequestId: string | null,
    fallbackUserId: string,
    title: string,
    body: string,
    ctaLabel: string,
  ) {
    const fundingRequest = fundingRequestId ? await this.fundingRepository.findById(fundingRequestId) : null;
    const memberIds = fundingRequest
      ? await this.organizationsRepository.findAllMemberUserIds(fundingRequest.organizationId)
      : [fallbackUserId];
    await this.notificationsService.notifyMany(
      memberIds,
      title,
      body,
      fundingRequestId ? pmeFundingRequestLink(fundingRequestId) : undefined,
      { email: true, ctaLabel },
    );
  }

  // [ADMIN] Valide la réclamation : commission prélevée, versement net à la PME.
  async approveClaim(claimId: string, adminId: string, proofDocumentId: string, paidAt: string) {
    const approved = await this.fundingRepository.approveFundingClaim(claimId, adminId, proofDocumentId, paidAt);

    await this.notifyOrganizationOfFundingRequest(
      approved.fundingRequestId,
      approved.requestedById,
      'Réclamation de financement validée',
      `Votre réclamation de ${Number(approved.amountRequested).toLocaleString('fr-FR')} F CFA a été validée et versée, net de la commission plateforme de 2% : ${Number(approved.amountNet).toLocaleString('fr-FR')} F CFA.`,
      'Voir ma demande',
    );

    return approved;
  }

  // [ADMIN] Rejette la réclamation.
  async rejectClaim(claimId: string, adminId: string, reason: string) {
    const rejected = await this.fundingRepository.rejectFundingClaim(claimId, adminId, reason);

    await this.notifyOrganizationOfFundingRequest(
      rejected.fundingRequestId,
      rejected.requestedById,
      'Réclamation de financement rejetée',
      `Votre réclamation a été rejetée : ${reason}`,
      'Voir ma demande',
    );

    return rejected;
  }

  async getPendingClaims() {
    return this.fundingRepository.findPendingFundingClaims();
  }
}
