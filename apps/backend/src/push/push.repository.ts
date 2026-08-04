import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';

@Injectable()
export class PushRepository {
  private prisma = new PrismaClient();

  // upsert sur `endpoint` (unique) plutôt que create : le même navigateur peut
  // se ré-abonner (ex. permission révoquée puis ré-accordée) sans dupliquer la
  // ligne, et si un autre compte avait utilisé cet appareil, l'abonnement bascule
  // vers l'utilisateur courant.
  async upsert(userId: string, endpoint: string, p256dh: string, auth: string, userAgent?: string) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth, userAgent },
      create: { userId, endpoint, p256dh, auth, userAgent },
    });
  }

  async deleteByEndpoint(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async deleteByUserAndEndpoint(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async findAllByUserId(userId: string) {
    return this.prisma.pushSubscription.findMany({ where: { userId } });
  }
}
