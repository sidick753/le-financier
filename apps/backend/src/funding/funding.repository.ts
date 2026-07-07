import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
import {
  IFundingRepository,
  CreateFundingRequestData,
} from './interfaces/funding-repository.interface';

const SCORING_FIELDS_FACTURE = [
  'debiteurNom', 'debiteurType', 'debiteurSolvabilite', 'echeanceFactureDate',
  'ancienneteRelation', 'partPlusGrosClient', 'delaiPaiementMenu',
  'tauxImpaye12m', 'nbClientsActifs',
] as const;

const SCORING_FIELDS_PRET = [
  'cashFlowAnnuel', 'fluxMobileMoneyMensuel', 'autonomieFinanciere',
  'tauxEndettement', 'ratioLiquidite', 'garantieType', 'garantieCouverture',
  'dirigeantExperienceAns', 'dirigeantAntecedents', 'dirigeantIncidentsLegaux',
  'secteurCode', 'secteurSaisonnalite', 'secteurImportDevises', 'secteurSoutienPublic',
] as const;

const SCORING_FIELDS_EQUITY = [
  'tcamCa3ans', 'tailleMarche', 'scalabilite', 'experienceSecteurAns',
  'trackRecord', 'completudeEquipe', 'moat', 'partMarcheRelative',
  'runwayMois', 'margeBrute', 'droitsInvestisseur', 'transparence',
] as const;

const ALL_SCORING_FIELDS = [
  ...SCORING_FIELDS_FACTURE,
  ...SCORING_FIELDS_PRET,
  ...SCORING_FIELDS_EQUITY,
] as const;

type ScoringField = typeof ALL_SCORING_FIELDS[number];

function hasScoringData(data: CreateFundingRequestData): boolean {
  return ALL_SCORING_FIELDS.some((field) => data[field] !== undefined && data[field] !== null);
}

@Injectable()
export class FundingRepository implements IFundingRepository {
  private prisma = new PrismaClient();

  async findById(id: string) {
    return this.prisma.fundingRequest.findUnique({
      where: { id },
      include: {
        organization: true,
        scoringReports: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async findAllByOrganizationId(organizationId: string) {
    return this.prisma.fundingRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { investments: true } },
      },
    });
  }

  async findAllPublished(filters?: { category?: string; search?: string }) {
    return this.prisma.fundingRequest.findMany({
      where: {
        status: 'PUBLISHED',
        ...(filters?.category ? { category: filters.category as any } : {}),
        ...(filters?.search
          ? {
              OR: [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { organization: { legalName: { contains: filters.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        organization: true,
        scoringReports: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateFundingRequestData) {
    return this.prisma.$transaction(async (tx) => {
      const fundingRequest = await tx.fundingRequest.create({
        data: {
          organizationId: data.organizationId,
          title: data.title,
          description: data.description,
          category: data.category as any,
          amountRequested: data.amountRequested,
          expectedReturn: data.expectedReturn,
          durationMonths: data.durationMonths,
        },
      });

      if (hasScoringData(data)) {
        await tx.scoringInput.create({
          data: {
            fundingRequestId: fundingRequest.id,
            product: data.category,
            debiteurNom: data.debiteurNom,
            debiteurType: data.debiteurType,
            debiteurSolvabilite: data.debiteurSolvabilite,
            echeanceFactureDate: data.echeanceFactureDate ? new Date(data.echeanceFactureDate) : undefined,
            ancienneteRelation: data.ancienneteRelation,
            partPlusGrosClient: data.partPlusGrosClient,
            delaiPaiementMenu: data.delaiPaiementMenu,
            tauxImpaye12m: data.tauxImpaye12m,
            nbClientsActifs: data.nbClientsActifs,
            cashFlowAnnuel: data.cashFlowAnnuel,
            fluxMobileMoneyMensuel: data.fluxMobileMoneyMensuel,
            autonomieFinanciere: data.autonomieFinanciere,
            tauxEndettement: data.tauxEndettement,
            ratioLiquidite: data.ratioLiquidite,
            garantieType: data.garantieType,
            garantieCouverture: data.garantieCouverture,
            dirigeantExperienceAns: data.dirigeantExperienceAns,
            dirigeantAntecedents: data.dirigeantAntecedents,
            dirigeantIncidentsLegaux: data.dirigeantIncidentsLegaux,
            secteurCode: data.secteurCode,
            secteurSaisonnalite: data.secteurSaisonnalite,
            secteurImportDevises: data.secteurImportDevises,
            secteurSoutienPublic: data.secteurSoutienPublic,
            tcamCa3ans: data.tcamCa3ans,
            tailleMarche: data.tailleMarche,
            scalabilite: data.scalabilite,
            experienceSecteurAns: data.experienceSecteurAns,
            trackRecord: data.trackRecord,
            completudeEquipe: data.completudeEquipe,
            moat: data.moat,
            partMarcheRelative: data.partMarcheRelative,
            runwayMois: data.runwayMois,
            margeBrute: data.margeBrute,
            droitsInvestisseur: data.droitsInvestisseur,
            transparence: data.transparence,
          },
        });
      }

      return fundingRequest;
    });
  }

  async updateStatus(id: string, status: any) {
    return this.prisma.fundingRequest.update({
      where: { id },
      data: { status },
    });
  }

  async findOrganizationOwner(organizationId: string) {
    return this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'OWNER' },
    });
  }

  async findAllForAdmin() {
    return this.prisma.fundingRequest.findMany({
      include: {
        organization: { select: { legalName: true } },
        _count: { select: { investments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
