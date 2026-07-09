import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@le-financier/database';
import {
  IFundingRepository,
  CreateFundingRequestData,
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
    const [total, published, funded, closed, raised] = await Promise.all([
      this.prisma.fundingRequest.count(),
      this.prisma.fundingRequest.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.fundingRequest.count({ where: { status: 'FUNDED' } }),
      this.prisma.fundingRequest.count({ where: { status: { in: ['CLOSED', 'CANCELLED'] } } }),
      this.prisma.fundingRequest.aggregate({ _sum: { amountRaised: true } }),
    ]);
    return {
      total,
      published,
      funded,
      closed,
      totalRaised: Number(raised._sum.amountRaised ?? 0),
    };
  }
}
