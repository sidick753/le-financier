import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Doit correspondre au compte créé par seed-admin.ts
const ADMIN_EMAIL = 'admin@lefinancier.ci';

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    throw new Error(
      `Compte admin introuvable (${ADMIN_EMAIL}). Lance "npm run seed:admin" avant de vider la base.`,
    );
  }

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('users', '_prisma_migrations')
  `;

  if (tables.length > 0) {
    const names = tables.map((t) => `"${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} CASCADE;`);
  }

  const { count } = await prisma.user.deleteMany({
    where: { email: { not: ADMIN_EMAIL } },
  });

  console.log(
    `Base vidée : ${tables.length} table(s) truncatée(s), ${count} utilisateur(s) supprimé(s). Conservé : ${ADMIN_EMAIL}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
