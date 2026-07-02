import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
import {
  IFundingRepository,
  CreateFundingRequestData,
} from './interfaces/funding-repository.interface';

@Injectable()
export class FundingRepository implements IFundingRepository {
  private prisma = new PrismaClient();

  async findById(id: string) {
    return this.prisma.fundingRequest.findUnique({
      where: { id },
      include: { organization: true },
    });
  }

  async findAllByOrganizationId(organizationId: string) {
    return this.prisma.fundingRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { investments: true },
        },
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
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateFundingRequestData) {
    return this.prisma.fundingRequest.create({ data });
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
