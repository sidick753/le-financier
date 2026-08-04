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

  // Autorise l'upload d'une preuve de virement (SETTLEMENT_PROOF) : l'investisseur
  // n'est jamais membre de l'organisation PME propriétaire de la demande, donc le
  // contrôle d'accès habituel (isMember) ne peut pas s'appliquer à ce type de document.
  async hasInvestmentEngagement(fundingRequestId: string, investorIds: string[]) {
    const count = await this.prisma.investment.count({
      where: { fundingRequestId, investorId: { in: investorIds } },
    });
    return count > 0;
  }

  // Documents rattachés directement à un utilisateur (ex. pièce d'identité
  // d'un investisseur particulier), sans organisation ni demande de financement.
  async findPersonalDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { uploadedById: userId, organizationId: null, fundingRequestId: null },
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
