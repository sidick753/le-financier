import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@le-financier/database';
import {
  IOrganizationsRepository,
  CreateOrganizationData,
  CreditProfileData,
  BankInfoData,
  IdentityData,
} from './interfaces/organizations-repository.interface';
import { CreateUserData } from '../users/interfaces/users-repository.interface';

@Injectable()
export class OrganizationsRepository implements IOrganizationsRepository {
  private prisma = new PrismaClient();

  async findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        scoringReports: {
          where: { product: 'ORGANISATION' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findByIdAdmin(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        fundingRequests: {
          orderBy: { createdAt: 'desc' },
        },
        documents: true,
        scoringReports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByRegistrationNumber(registrationNumber: string) {
    return this.prisma.organization.findUnique({ where: { registrationNumber } });
  }

  async findAllByUserId(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWithOwner(data: CreateOrganizationData, ownerId: string) {
    // Transaction : créer l'organisation ET son membre OWNER en une seule opération atomique.
    // Si l'une des deux écritures échoue, l'autre est annulée — jamais d'organisation orpheline sans propriétaire.
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: ownerId,
          role: 'OWNER',
        },
      });

      return organization;
    });
  }

  async registerOwner(userData: Omit<CreateUserData, 'role'>, orgData: CreateOrganizationData) {
    // Inscription PME_OWNER : User + Organization + OrganizationMember(OWNER) doivent être
    // créés atomiquement, sinon un compte peut exister sans organisation associée.
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { ...userData, role: 'PME_OWNER' } });
      const organization = await tx.organization.create({ data: orgData });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return { user, organization };
    });
  }

  async isMember(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    return member !== null;
  }

  async findOwnerMember(organizationId: string) {
    return this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'OWNER' },
    });
  }

  async findAll(filters?: { status?: string; search?: string; page?: number; limit?: number }) {
    const where: Prisma.OrganizationWhereInput = {
      ...(filters?.status ? { verificationStatus: filters.status as any } : {}),
      ...(filters?.search
        ? { legalName: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };
    const { page, limit } = filters ?? {};
    const hasPagination = page !== undefined && limit !== undefined;

    const [data, count] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: {
          members: {
            where: { role: 'OWNER' },
            include: { user: { select: { firstName: true, lastName: true } } },
            take: 1,
          },
          fundingRequests: {
            select: { id: true, amountRaised: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: hasPagination ? (page - 1) * limit : undefined,
        take: hasPagination ? limit : undefined,
      }),
      // Sans pagination, `data` contient déjà toutes les lignes : pas besoin d'un COUNT séparé.
      hasPagination ? this.prisma.organization.count({ where }) : Promise.resolve(undefined),
    ]);

    return { data, total: count ?? data.length };
  }

  async countByStatus() {
    const [total, verified, pending, financed] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.organization.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.fundingRequest.aggregate({ _sum: { amountRaised: true } }),
    ]);
    return {
      total,
      verified,
      pending,
      rejected: total - verified - pending,
      totalFinanced: Number(financed._sum.amountRaised ?? 0),
    };
  }

  async updateVerificationStatus(
    id: string,
    status: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    return this.prisma.organization.update({
      where: { id },
      data: {
        verificationStatus: status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });
  }

  async updateCreditProfile(id: string, data: CreditProfileData) {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async updateBankInfo(id: string, data: BankInfoData) {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async updateIdentity(id: string, data: IdentityData) {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async updateCompliance(id: string, dirigeantEstPep: boolean) {
    return this.prisma.organization.update({
      where: { id },
      data: { dirigeantEstPep },
    });
  }
}
