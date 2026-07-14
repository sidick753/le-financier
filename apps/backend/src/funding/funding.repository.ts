import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@le-financier/database';
import {
  IFundingRepository,
  CreateFundingRequestData,
  UpdateFundingRequestData,
  FundingAdminFilters,
} from './interfaces/funding-repository.interface';
import { ALL_SCORING_FIELDS } from '../scoring/scoring-fields';

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

  async findByIdAdmin(id: string) {
    return this.prisma.fundingRequest.findUnique({
      where: { id },
      include: {
        organization: true,
        documents: true,
        scoringReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        investments: {
          include: {
            investor: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
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
    const results = await this.prisma.fundingRequest.findMany({
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
        // Ne sert qu'aux dossiers SINGLE_INVESTOR : permet d'afficher "déjà pris"
        // sur les cards sans exposer les investissements eux-mêmes (voir
        // hasActiveInvestor plus bas dans ce fichier pour le détail à l'unité).
        _count: {
          select: {
            investments: {
              where: { status: { in: ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(({ _count, ...fr }) => ({ ...fr, hasActiveInvestor: _count.investments > 0 }));
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
          investorMode: data.investorMode,
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
            garantieType: data.garantieType,
            garantieCouverture: data.garantieCouverture,
          },
        });
      }

      return fundingRequest;
    });
  }

  async updateStatus(id: string, status: any, rejectionReason?: string) {
    return this.prisma.fundingRequest.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });
  }

  async update(id: string, data: UpdateFundingRequestData) {
    return this.prisma.fundingRequest.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category as any,
        amountRequested: data.amountRequested,
        expectedReturn: data.expectedReturn,
        durationMonths: data.durationMonths,
        investorMode: data.investorMode,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.fundingRequest.delete({ where: { id } });
  }

  // [ADMIN] Décaisse les fonds accumulés (validés admin) vers la PME, en retirant
  // la commission de financement due sur ce dossier (FUNDED → CLOSED).
  // La garde de statut (doit être FUNDED) est faite en amont par le service.
  async disburse(id: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const fundingRequest = await tx.fundingRequest.findUniqueOrThrow({ where: { id } });

      const pendingCommissions = await tx.commission.findMany({
        where: { fundingRequestId: id, type: 'FUNDING_FEE', status: 'PENDING' },
      });
      const totalCommission = pendingCommissions.reduce(
        (sum, c) => sum + Number(c.commissionAmount),
        0,
      );
      const disbursedAmount = Number(fundingRequest.amountRaised) - totalCommission;

      if (pendingCommissions.length > 0) {
        await tx.commission.updateMany({
          where: { id: { in: pendingCommissions.map((c) => c.id) } },
          data: { status: 'COLLECTED' },
        });
      }

      return tx.fundingRequest.update({
        where: { id },
        data: {
          status: 'CLOSED',
          disbursedAt: new Date(),
          disbursedAmount,
          disbursedById: adminId,
        },
      });
    });
  }

  // Utilisé uniquement pour les demandes en mode SINGLE_INVESTOR : indique si un
  // investisseur a déjà pris la place exclusive (NEGOTIATING/COMMITTED/SETTLED),
  // avant même que amountRaised ne bouge (qui ne reflète que le SETTLED_OFF_PLATFORM,
  // voir InvestmentsRepository.approveSettlement). Sert à éviter qu'un second
  // investisseur ne tente un engagement voué à l'échec sans comprendre pourquoi.
  async hasActiveInvestor(fundingRequestId: string): Promise<boolean> {
    const count = await this.prisma.investment.count({
      where: {
        fundingRequestId,
        status: { in: ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] },
      },
    });
    return count > 0;
  }

  async findOrganizationOwner(organizationId: string) {
    return this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'OWNER' },
    });
  }

  async findAllForAdmin(filters?: FundingAdminFilters) {
    const where: Prisma.FundingRequestWhereInput = {
      ...(filters?.status ? { status: filters.status as any } : {}),
      ...(filters?.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { organization: { legalName: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const { page, limit } = filters ?? {};
    const hasPagination = page !== undefined && limit !== undefined;

    const [data, count] = await Promise.all([
      this.prisma.fundingRequest.findMany({
        where,
        include: {
          organization: { select: { legalName: true } },
          _count: { select: { investments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: hasPagination ? (page - 1) * limit : undefined,
        take: hasPagination ? limit : undefined,
      }),
      hasPagination ? this.prisma.fundingRequest.count({ where }) : Promise.resolve(undefined),
    ]);

    return { data, total: count ?? data.length };
  }

  async getAdminStats() {
    const [total, underReview, published, funded, closed, raised] = await Promise.all([
      this.prisma.fundingRequest.count(),
      this.prisma.fundingRequest.count({ where: { status: 'UNDER_REVIEW' } }),
      this.prisma.fundingRequest.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.fundingRequest.count({ where: { status: 'FUNDED' } }),
      this.prisma.fundingRequest.count({ where: { status: { in: ['CLOSED', 'CANCELLED'] } } }),
      this.prisma.fundingRequest.aggregate({ _sum: { amountRaised: true } }),
    ]);
    return {
      total,
      underReview,
      published,
      funded,
      closed,
      totalRaised: Number(raised._sum.amountRaised ?? 0),
    };
  }
}
