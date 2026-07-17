import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Avant le passage au flux PayoutClaim (réclamations progressives), les commissions
// FUNDING_FEE pouvaient être créées en statut PENDING puis basculées COLLECTED au
// décaissement — ce code de bascule a disparu avec l'ancien flux (voir FundingService,
// où disburse() a été remplacé par approveFundingClaim). Toute commission encore
// PENDING créée avant ce changement resterait donc orpheline pour toujours, jamais
// comptée dans getCommissionStats()/getAllCommissions(). Script ponctuel, idempotent
// (relançable sans risque) : à exécuter une fois après déploiement sur une base ayant
// existé avant ce changement — la base de dev n'en contient aucune à ce jour.
async function main() {
  const orphaned = await prisma.commission.findMany({
    where: { status: 'PENDING' },
    select: { id: true, type: true, commissionAmount: true },
  });

  if (orphaned.length === 0) {
    console.log('Aucune commission PENDING orpheline — rien à faire.');
    return;
  }

  const { count } = await prisma.commission.updateMany({
    where: { id: { in: orphaned.map((c) => c.id) } },
    data: { status: 'COLLECTED' },
  });

  const total = orphaned.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  console.log(
    `${count} commission(s) PENDING basculée(s) en COLLECTED (total ${total.toLocaleString('fr-FR')} F CFA).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
