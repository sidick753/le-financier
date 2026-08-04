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

  // Un investissement/négociation appartient à l'institution du membre qui l'a
  // engagé, pas au membre lui-même — investorIds regroupe donc tous les
  // membres de l'institution (voir InstitutionsService.getFellowMemberUserIds).
  async findAllByInvestorIds(investorIds: string[]) {
    return this.prisma.investment.findMany({
      where: { investorId: { in: investorIds } },
      include: {
        fundingRequest: {
          include: {
            organization: { select: { legalName: true, sector: true } },
            scoringReports: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        negotiationOffers: { orderBy: { createdAt: 'desc' } },
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
    conditions?: string,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const fundingRequest = await tx.fundingRequest.findUnique({
        where: { id: fundingRequestId },
      });

      if (!fundingRequest || fundingRequest.status !== 'PUBLISHED') {
        throw new ConflictException("Cette demande n'est plus ouverte aux engagements.");
      }

      const activeInvestments = await tx.investment.findMany({
        where: {
          fundingRequestId,
          status: { in: ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] },
        },
      });

      const currentTotal = activeInvestments.reduce((sum, inv) => sum + Number(inv.amountCommitted), 0);
      const requested = Number(fundingRequest.amountRequested);
      const remaining = requested - currentTotal;

      if (amountCommitted > remaining) {
        throw new ConflictException(
          `Montant trop élevé. Il reste ${remaining} ${fundingRequest.currency} disponibles sur cette demande.`,
        );
      }

      // La PME a choisi de ne financer ce dossier qu'avec un seul investisseur, à
      // 100% du montant — pas de partage possible ni d'engagement partiel.
      if (fundingRequest.investorMode === 'SINGLE_INVESTOR') {
        const hasOtherInvestor = activeInvestments.some((inv) => inv.investorId !== investorId);
        if (hasOtherInvestor) {
          throw new ConflictException(
            "Cette demande n'accepte qu'un seul investisseur pour 100% du montant — un autre investisseur y est déjà engagé.",
          );
        }
        if (amountCommitted !== remaining) {
          throw new ConflictException(
            `Cette PME souhaite un investisseur unique finançant 100% du montant, soit ${remaining} ${fundingRequest.currency}.`,
          );
        }
      }

      const investment = await tx.investment.create({
        data: { fundingRequestId, investorId, amountCommitted, status: 'NEGOTIATING', conditions },
      });

      await tx.negotiationOffer.create({
        data: { investmentId: investment.id, proposedBy: 'INVESTOR', proposedReturn, conditions, note, status: 'PENDING' },
      });

      return investment;
    });
  }

  async counterOffer(
    investmentId: string,
    proposedBy: 'INVESTOR' | 'PME',
    proposedReturn: number,
    conditions?: string,
    note?: string,
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
        data: { investmentId, proposedBy, proposedReturn, conditions, note, status: 'PENDING' },
      });

      return tx.investment.update({
        where: { id: investmentId },
        // Les conditions "actuelles" de l'engagement suivent le dernier tour —
        // seulement si ce tour en précise de nouvelles, sinon elles restent celles d'avant.
        data: conditions !== undefined ? { conditions } : {},
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

      // amountRaised ne reflète que les virements validés par un admin (SETTLED_OFF_PLATFORM) —
      // un simple engagement COMMITTED ne compte pas comme fonds levés, voir settle()/approveSettlement().
      return updated;
    });
  }

  // Abandon unilatéral : contrairement à accept/counter, pas de contrainte de tour —
  // n'importe quelle partie peut mettre fin à une négociation bloquée à tout moment.
  async rejectOffer(investmentId: string, rejectedBy: 'INVESTOR' | 'PME') {
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
      if (lastOffer && lastOffer.status === 'PENDING') {
        await tx.negotiationOffer.update({
          where: { id: lastOffer.id },
          data: { status: 'REJECTED' },
        });
      }

      return tx.investment.update({
        where: { id: investmentId },
        data: { status: 'REJECTED' },
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

  // Une institution peut avoir plusieurs négociations distinctes en parallèle sur le
  // même dossier (une par collègue qui a engagé — pas de déduplication à la création,
  // cf. règle métier). On priorise donc l'engagement propre de l'appelant (ownInvestorId) ;
  // à défaut, celui d'un collègue (investorIds) toujours actif, pour que la page de détail
  // retrouve au moins la négociation en cours même si c'est un collègue qui l'a initiée ;
  // sinon le plus récent (ex. après un REJECTED), pour garder du contexte.
  async findByFundingRequestAndInvestors(fundingRequestId: string, ownInvestorId: string, investorIds: string[]) {
    const investments = await this.prisma.investment.findMany({
      where: { fundingRequestId, investorId: { in: investorIds } },
      include: {
        negotiationOffers: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (investments.length === 0) return null;
    const mine = investments.find((inv) => inv.investorId === ownInvestorId);
    if (mine) return mine;
    return investments.find((inv) => !['REJECTED', 'CANCELLED'].includes(inv.status)) ?? investments[0];
  }

  async findAllForOrganization(organizationId: string) {
    return this.prisma.investment.findMany({
      where: { fundingRequest: { organizationId } },
      include: {
        fundingRequest: { select: { id: true, title: true, currency: true, organizationId: true } },
        investor: { select: { firstName: true, lastName: true, email: true } },
        negotiationOffers: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countPendingSettlements() {
    return this.prisma.investment.count({ where: { status: 'SETTLEMENT_SUBMITTED' } });
  }

  // Soumission par l'investisseur : dépose une preuve de virement, en attente de
  // validation par un admin. Ne touche ni amountRaised ni le statut de la FundingRequest.
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
          'Seul un engagement en attente peut être soumis pour validation.',
        );
      }

      return tx.investment.update({
        where: { id: investmentId },
        data: {
          status: 'SETTLEMENT_SUBMITTED',
          settlementProofId,
          settlementRejectionReason: null,
        },
      });
    });
  }

  // Validation admin de la preuve de virement : engagement confirmé, amountRaised
  // recalculé sur les seuls virements validés, FUNDED déclenché si 100% atteint.
  async approveSettlement(investmentId: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({ where: { id: investmentId } });

      if (!investment) {
        throw new ConflictException('Engagement introuvable.');
      }
      if (investment.status !== 'SETTLEMENT_SUBMITTED') {
        throw new ConflictException("Cet engagement n'a pas de preuve en attente de validation.");
      }

      const updatedInvestment = await tx.investment.update({
        where: { id: investmentId },
        data: {
          status: 'SETTLED_OFF_PLATFORM',
          settledAt: new Date(),
          settlementValidatedById: adminId,
          settlementValidatedAt: new Date(),
        },
      });

      if (investment.settlementProofId) {
        await tx.document.update({
          where: { id: investment.settlementProofId },
          data: { status: 'APPROVED' },
        });
      }

      // Recalcul à partir de la seule somme des virements validés — jamais en incrémentant
      // à l'aveugle, ça évite toute dérive en cas de double appel.
      const settledSum = await tx.investment.aggregate({
        where: { fundingRequestId: investment.fundingRequestId, status: 'SETTLED_OFF_PLATFORM' },
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
        data: { amountRaised: totalRaised, status: newStatus },
      });

      return updatedInvestment;
    });
  }

  // Rejet admin : l'investisseur retombe en COMMITTED et doit soumettre une nouvelle preuve.
  async rejectSettlement(investmentId: string, adminId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({ where: { id: investmentId } });

      if (!investment) {
        throw new ConflictException('Engagement introuvable.');
      }
      if (investment.status !== 'SETTLEMENT_SUBMITTED') {
        throw new ConflictException("Cet engagement n'a pas de preuve en attente de validation.");
      }

      if (investment.settlementProofId) {
        await tx.document.update({
          where: { id: investment.settlementProofId },
          data: { status: 'REJECTED' },
        });
      }

      return tx.investment.update({
        where: { id: investmentId },
        data: {
          status: 'COMMITTED',
          settlementRejectionReason: reason,
          settlementValidatedById: adminId,
          settlementValidatedAt: new Date(),
        },
      });
    });
  }
}
