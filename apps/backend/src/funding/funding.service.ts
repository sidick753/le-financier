import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FundingCategory, FundingInvestorMode } from '@le-financier/database';
import { FundingRepository } from './funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ScoringService } from '../scoring/scoring.service';
import { DocumentsService } from '../documents/documents.service';
import { CreateFundingRequestDto } from './dto/create-funding-request.dto';
import { UpdateFundingRequestDto } from './dto/update-funding-request.dto';
import { FundingAdminFilters } from './interfaces/funding-repository.interface';
import { EDITABLE_FUNDING_STATUSES, PUBLIC_FUNDING_STATUSES } from './funding-status.constants';

@Injectable()
export class FundingService {
  constructor(
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
    private scoringService: ScoringService,
    private documentsService: DocumentsService,
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

    if (!PUBLIC_FUNDING_STATUSES.includes(fundingRequest.status)) {
      if (!userId) {
        throw new ForbiddenException("Cette demande n'est pas accessible publiquement.");
      }
      const isMember = await this.organizationsRepository.isMember(
        fundingRequest.organizationId,
        userId,
      );
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

    return { ...fundingRequest, hasActiveInvestor };
  }

  async findOneAdmin(id: string) {
    const fundingRequest = await this.fundingRepository.findByIdAdmin(id);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }
    return fundingRequest;
  }

  async findAllPublished(filters?: { category?: string; search?: string }) {
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

    return this.fundingRepository.updateStatus(fundingRequestId, 'PUBLISHED');
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

    return this.fundingRepository.updateStatus(fundingRequestId, 'REJECTED', reason);
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
    return this.fundingRepository.updateStatus(id, 'CANCELLED');
  }

  async reactivate(id: string) {
    const fr = await this.fundingRepository.findById(id);
    if (!fr) throw new NotFoundException('Demande introuvable.');
    if (fr.status !== 'CANCELLED') {
      throw new BadRequestException('Seule une demande suspendue peut être réactivée.');
    }
    return this.fundingRepository.updateStatus(id, 'PUBLISHED');
  }

  async disburse(id: string, adminId: string) {
    const fr = await this.fundingRepository.findById(id);
    if (!fr) throw new NotFoundException('Demande introuvable.');
    if (fr.status !== 'FUNDED') {
      throw new BadRequestException('Seule une demande entièrement financée (FUNDED) peut être décaissée.');
    }
    return this.fundingRepository.disburse(id, adminId);
  }
}
