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
      include: {
        fundingRequest: {
          include: { organization: { select: { legalName: true } } },
        },
      },
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

  async createNegotiation(
    fundingRequestId: string,
    investorId: string,
    amountCommitted: number,
    proposedReturn: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const fundingRequest = await tx.fundingRequest.findUnique({
        where: { id: fundingRequestId },
      });

      if (!fundingRequest || fundingRequest.status !== 'PUBLISHED') {
        throw new ConflictException("Cette demande n'est plus ouverte aux engagements.");
      }

      const activeSum = await tx.investment.aggregate({
        where: {
          fundingRequestId,
          status: { in: ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] },
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

      const investment = await tx.investment.create({
        data: { fundingRequestId, investorId, amountCommitted, status: 'NEGOTIATING' },
      });

      await tx.negotiationOffer.create({
        data: { investmentId: investment.id, proposedBy: 'INVESTOR', proposedReturn, status: 'PENDING' },
      });

      return investment;
    });
  }

  async counterOffer(
    investmentId: string,
    proposedBy: 'INVESTOR' | 'PME',
    proposedReturn: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({
        where: { id: investmentId },
        include: {
          negotiationOffers: { orderBy: { createdAt: 'desc' }, take: 1 },
          fundingRequest: {
            include: {
              organization: {
                include: { members: { where: { role: 'OWNER' }, take: 1 } },
              },
            },
          },
          investor: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!investment || investment.status !== 'NEGOTIATING') {
        throw new ConflictException("Cet engagement n'est pas en négociation.");
      }

      const lastOffer = investment.negotiationOffers[0];
      if (lastOffer && lastOffer.proposedBy === proposedBy) {
        throw new ConflictException(
          "Vous ne pouvez pas contre-proposer deux fois de suite, en attente d'une réponse.",
        );
      }

      if (lastOffer) {
        await tx.negotiationOffer.update({
          where: { id: lastOffer.id },
          data: { status: 'COUNTERED' },
        });
      }

      await tx.negotiationOffer.create({
        data: { investmentId, proposedBy, proposedReturn, status: 'PENDING' },
      });

      return tx.investment.findUnique({
        where: { id: investmentId },
        include: {
          fundingRequest: {
            include: {
              organization: {
                include: { members: { where: { role: 'OWNER' }, take: 1 } },
              },
            },
          },
          investor: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  async acceptOffer(investmentId: string, acceptedBy: 'INVESTOR' | 'PME') {
    return this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({
        where: { id: investmentId },
        include: {
          negotiationOffers: { orderBy: { createdAt: 'desc' }, take: 1 },
          fundingRequest: {
            include: {
              organization: {
                include: { members: { where: { role: 'OWNER' }, take: 1 } },
              },
            },
          },
          investor: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!investment || investment.status !== 'NEGOTIATING') {
        throw new ConflictException("Cet engagement n'est pas en négociation.");
      }

      const lastOffer = investment.negotiationOffers[0];
      if (!lastOffer) {
        throw new ConflictException('Aucune proposition à accepter.');
      }
      if (lastOffer.proposedBy === acceptedBy) {
        throw new ConflictException("Vous ne pouvez pas accepter votre propre proposition.");
      }

      await tx.negotiationOffer.update({
        where: { id: lastOffer.id },
        data: { status: 'ACCEPTED' },
      });

      const updated = await tx.investment.update({
        where: { id: investmentId },
        data: { status: 'COMMITTED', lockedReturn: lastOffer.proposedReturn },
        include: {
          fundingRequest: {
            include: {
              organization: {
                include: { members: { where: { role: 'OWNER' }, take: 1 } },
              },
            },
          },
          investor: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Recalculer amountRaised en incluant COMMITTED + SETTLED_OFF_PLATFORM
      const raisedSum = await tx.investment.aggregate({
        where: {
          fundingRequestId: investment.fundingRequestId,
          status: { in: ['COMMITTED', 'SETTLED_OFF_PLATFORM'] },
        },
        _sum: { amountCommitted: true },
      });
      await tx.fundingRequest.update({
        where: { id: investment.fundingRequestId },
        data: { amountRaised: Number(raisedSum._sum.amountCommitted ?? 0) },
      });

      return updated;
    });
  }

  async findByFundingRequestAndInvestor(fundingRequestId: string, investorId: string) {
    return this.prisma.investment.findFirst({
      where: { fundingRequestId, investorId },
      include: {
        negotiationOffers: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findAllForOrganization(organizationId: string) {
    return this.prisma.investment.findMany({
      where: { fundingRequest: { organizationId } },
      include: {
        fundingRequest: { select: { title: true, currency: true, organizationId: true } },
        investor: { select: { firstName: true, lastName: true, email: true } },
        negotiationOffers: { orderBy: { createdAt: 'desc' } },
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
          status: { in: ['COMMITTED', 'SETTLED_OFF_PLATFORM'] },
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
