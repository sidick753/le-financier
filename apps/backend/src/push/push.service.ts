import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PushRepository } from './push.repository';

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly configured: boolean;
  readonly publicKey: string;

  constructor(private pushRepository: PushRepository) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:notifications@le-financier.com';

    this.publicKey = publicKey ?? '';
    this.configured = !!publicKey && !!privateKey;
    if (this.configured) {
      webpush.setVapidDetails(subject, publicKey!, privateKey!);
    }
  }

  async subscribe(userId: string, endpoint: string, p256dh: string, auth: string, userAgent?: string) {
    return this.pushRepository.upsert(userId, endpoint, p256dh, auth, userAgent);
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.pushRepository.deleteByUserAndEndpoint(userId, endpoint);
  }

  // Best-effort, appelé depuis NotificationsService.notify() : ne doit jamais faire
  // échouer la notification in-app/email si l'envoi push échoue (réseau, clés
  // absentes, abonnement expiré...).
  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.configured) {
      this.logger.warn(`VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY absents — push "${payload.title}" à ${userId} non envoyée.`);
      return;
    }

    const subscriptions = await this.pushRepository.findAllByUserId(userId);
    if (subscriptions.length === 0) return;

    const json = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            json,
          );
        } catch (err: any) {
          // 404/410 = abonnement expiré/révoqué côté navigateur — on le nettoie
          // pour ne pas réessayer indéfiniment. Toute autre erreur est journalisée
          // et ignorée (best-effort, cf. commentaire ci-dessus).
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await this.pushRepository.deleteByEndpoint(sub.endpoint);
          } else {
            this.logger.warn(`Échec d'envoi push à ${sub.endpoint.slice(0, 40)}... : ${err?.message ?? err}`);
          }
        }
      }),
    );
  }
}
