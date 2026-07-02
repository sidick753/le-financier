import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FundingCategory } from '@le-financier/database';
import { FundingRepository } from './funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { CreateFundingRequestDto } from './dto/create-funding-request.dto';

@Injectable()
export class FundingService {
  constructor(
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
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
      // Scoring FACTURE
      debiteurNom: dto.debiteurNom,
      debiteurType: dto.debiteurType,
      debiteurSolvabilite: dto.debiteurSolvabilite,
      echeanceFactureDate: dto.echeanceFactureDate,
      ancienneteRelation: dto.ancienneteRelation,
      partPlusGrosClient: dto.partPlusGrosClient,
      delaiPaiementMenu: dto.delaiPaiementMenu,
      tauxImpaye12m: dto.tauxImpaye12m,
      nbClientsActifs: dto.nbClientsActifs,
      // Scoring PRET MLT
      cashFlowAnnuel: dto.cashFlowAnnuel,
      fluxMobileMoneyMensuel: dto.fluxMobileMoneyMensuel,
      autonomieFinanciere: dto.autonomieFinanciere,
      tauxEndettement: dto.tauxEndettement,
      ratioLiquidite: dto.ratioLiquidite,
      garantieType: dto.garantieType,
      garantieCouverture: dto.garantieCouverture,
      dirigeantExperienceAns: dto.dirigeantExperienceAns,
      dirigeantAntecedents: dto.dirigeantAntecedents,
      dirigeantIncidentsLegaux: dto.dirigeantIncidentsLegaux,
      secteurCode: dto.secteurCode,
      secteurSaisonnalite: dto.secteurSaisonnalite,
      secteurImportDevises: dto.secteurImportDevises,
      secteurSoutienPublic: dto.secteurSoutienPublic,
      // Scoring EQUITY
      tcamCa3ans: dto.tcamCa3ans,
      tailleMarche: dto.tailleMarche,
      scalabilite: dto.scalabilite,
      experienceSecteurAns: dto.experienceSecteurAns,
      trackRecord: dto.trackRecord,
      completudeEquipe: dto.completudeEquipe,
      moat: dto.moat,
      partMarcheRelative: dto.partMarcheRelative,
      runwayMois: dto.runwayMois,
      margeBrute: dto.margeBrute,
      droitsInvestisseur: dto.droitsInvestisseur,
      transparence: dto.transparence,
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

    return this.fundingRepository.updateStatus(fundingRequestId, 'UNDER_REVIEW');
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

  async reject(fundingRequestId: string) {
    const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    if (fundingRequest.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        'Seule une demande en révision peut être rejetée.',
      );
    }

    return this.fundingRepository.updateStatus(fundingRequestId, 'REJECTED');
  }

  async findAllForAdmin() {
    return this.fundingRepository.findAllForAdmin();
  }

  async cancel(id: string) {
    const fr = await this.fundingRepository.findById(id);
    if (!fr) throw new NotFoundException('Demande introuvable.');
    return this.fundingRepository.updateStatus(id, 'CANCELLED');
  }
}
