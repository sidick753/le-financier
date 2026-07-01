import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
import {
  IOrganizationsRepository,
  CreateOrganizationData,
} from './interfaces/organizations-repository.interface';

@Injectable()
export class OrganizationsRepository implements IOrganizationsRepository {
  private prisma = new PrismaClient();

  async findById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
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

  async isMember(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    return member !== null;
  }

  async findAll(filters?: { status?: string; search?: string }) {
    return this.prisma.organization.findMany({
      where: {
        ...(filters?.status ? { verificationStatus: filters.status as any } : {}),
        ...(filters?.search
          ? { legalName: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
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
    });
  }

  async countByStatus() {
    const [total, verified, pending] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.organization.count({ where: { verificationStatus: 'PENDING' } }),
    ]);
    return { total, verified, pending, rejected: total - verified - pending };
  }

  async updateVerificationStatus(id: string, status: 'VERIFIED' | 'REJECTED') {
    return this.prisma.organization.update({
      where: { id },
      data: { verificationStatus: status },
    });
  }
}
