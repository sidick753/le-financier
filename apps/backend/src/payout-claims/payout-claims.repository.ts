import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma, PayoutClaimDirection, PayoutClaimStatus } from '@le-financier/database';

type Tx = Prisma.TransactionClient;
type ClaimEntityFilter = { fundingRequestId: string } | { repaymentScheduleId: string };

// Partie de la machine à états de PayoutClaim strictement identique entre les deux
// directions (FUNDING_TO_PME côté FundingRepository, REPAYMENT_TO_INVESTOR côté
// RepaymentRepository) : somme des réclamations déjà faites, validation du montant
// demandé + création, passage à PAID, rejet, liste par entité.
//
// Ce qui reste volontairement hors de ce repository, car réellement différent d'une
// direction à l'autre : la source du "disponible" (FundingRequest.amountRaised vs
// somme des tranches CONFIRMED), la table à verrouiller (funding_requests vs
// repayment_schedules), le calcul de commission/montant net, et les effets de bord
// post-approbation (disbursedAmount / passage CLOSED côté financement).
@Injectable()
export class PayoutClaimsRepository {
  private prisma = new PrismaClient();

  async sumClaimed(
    tx: Tx,
    direction: PayoutClaimDirection,
    entityFilter: ClaimEntityFilter,
    statuses: PayoutClaimStatus[] = ['REQUESTED', 'PAID'],
    excludeClaimId?: string,
  ): Promise<number> {
    const sum = await tx.payoutClaim.aggregate({
      where: {
        direction,
        ...entityFilter,
        status: { in: statuses },
        ...(excludeClaimId ? { id: { not: excludeClaimId } } : {}),
      },
      _sum: { amountRequested: true },
    });
    return Number(sum._sum.amountRequested ?? 0);
  }

  async validateAndCreate(
    tx: Tx,
    direction: PayoutClaimDirection,
    entityFilter: ClaimEntityFilter,
    available: number,
    amount: number | undefined,
    requestedById: string,
  ) {
    const resolvedAmount = amount ?? available;
    if (resolvedAmount <= 0 || resolvedAmount > available) {
      throw new ConflictException(`Montant invalide. ${available} disponible(s) à réclamer.`);
    }
    return tx.payoutClaim.create({
      data: { direction, ...entityFilter, amountRequested: resolvedAmount, requestedById },
    });
  }

  async markPaid(tx: Tx, claimId: string, amountNet: number, adminId: string) {
    return tx.payoutClaim.update({
      where: { id: claimId },
      data: { status: 'PAID', amountNet, decidedById: adminId, decidedAt: new Date() },
    });
  }

  async reject(claimId: string, direction: PayoutClaimDirection, adminId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.payoutClaim.findUnique({ where: { id: claimId } });
      if (!claim || claim.direction !== direction) {
        throw new ConflictException('Réclamation introuvable.');
      }
      if (claim.status !== 'REQUESTED') {
        throw new ConflictException("Cette réclamation n'est pas en attente de décision.");
      }
      return tx.payoutClaim.update({
        where: { id: claimId },
        data: {
          status: 'REJECTED',
          decidedById: adminId,
          decidedAt: new Date(),
          rejectionReason: reason,
        },
      });
    });
  }

  async findMany(direction: PayoutClaimDirection, entityFilter: ClaimEntityFilter) {
    return this.prisma.payoutClaim.findMany({
      where: { direction, ...entityFilter },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
