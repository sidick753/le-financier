import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hash bcrypt pré-calculé pour "admin123456" — mot de passe attendu par le bouton
// de compte de test "Admin" sur la page de login (apps/frontend/src/app/login/page.tsx)
const ADMIN_PASSWORD_HASH = '$2b$12$jmyaA50dIrXmvJl0doNNoOD2RnQzk64fJePPMipSahIiQ6O3KQbti';

async function main() {
  const email = 'admin@lefinancier.ci';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Compte admin déjà présent : ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: ADMIN_PASSWORD_HASH,
      firstName: 'Admin',
      lastName: 'LeFinancier',
      role: 'ADMIN',
      kycStatus: 'VERIFIED',
    },
  });

  console.log(`Compte admin créé : ${email} (mot de passe : admin123456)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
