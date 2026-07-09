import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FundingCategory } from '@le-financier/database';
import { FundingRepository } from './funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ScoringService } from '../scoring/scoring.service';
import { CreateFundingRequestDto } from './dto/create-funding-request.dto';
import { FundingAdminFilters } from './interfaces/funding-repository.interface';

@Injectable()
export class FundingService {
  constructor(
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
    private scoringService: ScoringService,
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

  async findMineByOrganization(organizationId: string, userId: string) {
    const isMember = await this.organizationsRepository.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }

    return this.fundingRepository.findAllByOrganizationId(organizationId);
  }

  async findOneWithDetails(id: string) {
    const fundingRequest = await this.fundingRepository.findById(id);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }
    return fundingRequest;
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
}
