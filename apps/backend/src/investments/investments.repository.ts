import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
import { IInvestmentsRepository } from './interfaces/investments-repository.interface';

@Injectable()
export class InvestmentsRepository implements IInvestmentsRepository {
  private prisma = new PrismaClient();

  async findById(id: string) {
    return this.prisma.investment.findUnique({ where: { id } });
  }

  async findAllByFundingRequestId(fundingRequestId: string) {
    return this.prisma.investment.findMany({
      where: { fundingRequestId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByInvestorId(investorId: string) {
    return this.prisma.investment.findMany({
      where: { investorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sumActiveCommitments(fundingRequestId: string) {
    const result = await this.prisma.investment.aggregate({
      where: {
        fundingRequestId,
        status: { in: ['COMMITTED', 'SETTLED_OFF_PLATFORM'] },
      },
      _sum: { amountCommitted: true },
    });
    return Number(result._sum.amountCommitted ?? 0);
  }

  async create(fundingRequestId: string, investorId: string, amountCommitted: number) {
    // Transaction avec verrou : on relit la demande ET on revérifie le plafond
    // À L'INTÉRIEUR de la transaction, pour empêcher deux requêtes simultanées
    // de passer toutes les deux la vérification avant qu'aucune n'ait écrit.
    return this.prisma.$transaction(async (tx) => {
      const fundingRequest = await tx.fundingRequest.findUnique({
        where: { id: fundingRequestId },
      });

      if (!fundingRequest || fundingRequest.status !== 'PUBLISHED') {
        throw new ConflictException(
          "Cette demande n'est plus ouverte aux engagements.",
        );
      }

      const activeSum = await tx.investment.aggregate({
        where: {
          fundingRequestId,
          status: { in: ['COMMITTED', 'SETTLED_OFF_PLATFORM'] },
        },
        _sum: { amountCommitted: true },
      });

      const currentTotal = Number(activeSum._sum.amountCommitted ?? 0);
      const requested = Number(fundingRequest.amountRequested);

      if (currentTotal + amountCommitted > requested) {
        const remaining = requested - currentTotal;
        throw new ConflictException(
          `Montant trop élevé. Il reste ${remaining} ${fundingRequest.currency} disponibles sur cette demande.`,
        );
      }

      return tx.investment.create({
        data: {
          fundingRequestId,
          investorId,
          amountCommitted,
          lockedReturn: fundingRequest.expectedReturn,
          status: 'COMMITTED',
        },
      });
    });
  }

  async findAllForOrganization(organizationId: string) {
    return this.prisma.investment.findMany({
      where: { fundingRequest: { organizationId } },
      include: {
        fundingRequest: { select: { title: true, currency: true } },
        investor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async settle(investmentId: string, settlementProofId: string) {
    return this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({
        where: { id: investmentId },
      });

      if (!investment) {
        throw new ConflictException('Engagement introuvable.');
      }

      if (investment.status !== 'COMMITTED') {
        throw new ConflictException(
          'Seul un engagement en attente peut être confirmé.',
        );
      }

      const updatedInvestment = await tx.investment.update({
        where: { id: investmentId },
        data: {
          status: 'SETTLED_OFF_PLATFORM',
          settlementProofId,
          settledAt: new Date(),
        },
      });

      // Recalculer amountRaised à partir de la somme réelle des engagements confirmés,
      // jamais en incrémentant à l'aveugle — ça évite toute dérive en cas de double appel.
      const settledSum = await tx.investment.aggregate({
        where: {
          fundingRequestId: investment.fundingRequestId,
          status: 'SETTLED_OFF_PLATFORM',
        },
        _sum: { amountCommitted: true },
      });

      const totalRaised = Number(settledSum._sum.amountCommitted ?? 0);

      const fundingRequest = await tx.fundingRequest.findUnique({
        where: { id: investment.fundingRequestId },
      });

      if (!fundingRequest) {
        throw new ConflictException('Demande de financement introuvable.');
      }

      const newStatus =
        totalRaised >= Number(fundingRequest.amountRequested) ? 'FUNDED' : fundingRequest.status;

      await tx.fundingRequest.update({
        where: { id: investment.fundingRequestId },
        data: {
          amountRaised: totalRaised,
          status: newStatus,
        },
      });

      return updatedInvestment;
    });
  }
}
