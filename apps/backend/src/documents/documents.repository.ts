import { Injectable } from '@nestjs/common';
import { PrismaClient, Document } from '@le-financier/database';
import { IDocumentsRepository, CreateDocumentData } from './interfaces/documents-repository.interface';

@Injectable()
export class DocumentsRepository implements IDocumentsRepository {
  private prisma = new PrismaClient();

  async create(data: CreateDocumentData) {
    return this.prisma.document.create({ data });
  }

  async findById(id: string) {
    return this.prisma.document.findUnique({ where: { id } });
  }

  async findAllByOrganizationId(organizationId: string) {
    return this.prisma.document.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByFundingRequestId(fundingRequestId: string) {
    return this.prisma.document.findMany({
      where: { fundingRequestId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: Document['status'], rejectionReason?: string) {
    return this.prisma.document.update({
      where: { id },
      data: { status, rejectionReason: status === 'REJECTED' ? rejectionReason : null },
    });
  }

  async delete(id: string) {
    return this.prisma.document.delete({ where: { id } });
  }
}
