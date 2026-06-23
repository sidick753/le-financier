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
    });
  }

  async findAllPublished() {
    return this.prisma.fundingRequest.findMany({
      where: { status: 'PUBLISHED' },
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
}
