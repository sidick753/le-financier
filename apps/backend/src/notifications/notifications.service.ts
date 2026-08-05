import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsGateway } from './notifications.gateway';
import { UsersRepository } from '../users/users.repository';
import { MailService, renderEmail } from '../mail/mail.service';
import { PushService } from '../push/push.service';

export interface NotifyOptions {
  // Coûteux à envoyer par défaut (un email par notif in-app noierait les
  // utilisateurs) — chaque appelant doit explicitement demander le doublon email
  // pour les événements qui le justifient (ex. le cycle de négociation d'offres).
  email?: boolean;
  ctaLabel?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private notificationsRepository: NotificationsRepository,
    private notificationsGateway: NotificationsGateway,
    private usersRepository: UsersRepository,
    private mailService: MailService,
    private pushService: PushService,
  ) {}

  async notify(userId: string, title: string, body: string, link?: string, options?: NotifyOptions) {
    const notification = await this.notificationsRepository.create({
      userId,
      title,
      body,
      link,
    });

    this.notificationsGateway.emitToUser(userId, 'notification', notification);

    // Best-effort, comme le socket ci-dessus : suit chaque notif in-app sans
    // opt-in par appelant (contrairement à l'email, coûteux/intrusif) — no-op
    // silencieux si l'utilisateur n'a aucun abonnement ou si les clés VAPID ne
    // sont pas configurées (voir PushService).
    try {
      await this.pushService.sendToUser(userId, { title, body, link });
    } catch {
      // ignoré — ne doit jamais faire échouer la notification elle-même
    }

    if (options?.email) {
      try {
        const user = await this.usersRepository.findById(userId);
        if (user) {
          const cta = link ? { label: options.ctaLabel ?? 'Voir sur LeFinancier', url: link } : undefined;
          await this.mailService.send(user.email, title, renderEmail(title, body, cta));
        }
      } catch {
        // Best-effort comme le push ci-dessus : MailService.send() encaisse déjà
        // l'échec Resend en interne, mais un souci réseau/SDK plus en amont ne doit
        // jamais faire échouer l'action métier qui a déclenché cette notification
        // (ex. approveSettlement — l'argent a déjà bougé, l'email n'est qu'un relais).
      }
    }

    return notification;
  }

  async notifyAdmins(title: string, body: string, link?: string, options?: NotifyOptions) {
    const adminIds = await this.usersRepository.findAdminIds();
    await Promise.all(adminIds.map((adminId) => this.notify(adminId, title, body, link, options)));
  }

  // Événement qui concerne une entité représentée par plusieurs personnes (tous les
  // membres d'une institution investisseuse, ou tous les membres d'une PME) plutôt
  // qu'un individu précis — voir InstitutionsService (représentation) : l'action
  // appartient à l'entité, chacun de ses membres doit donc être informé, pas
  // seulement celui qui a cliqué à l'origine.
  async notifyMany(userIds: string[], title: string, body: string, link?: string, options?: NotifyOptions) {
    const uniqueIds = [...new Set(userIds)];
    await Promise.all(uniqueIds.map((userId) => this.notify(userId, title, body, link, options)));
  }

  async findMine(userId: string) {
    return this.notificationsRepository.findAllByUserId(userId);
  }

  async countUnread(userId: string) {
    return this.notificationsRepository.countUnread(userId);
  }

  async markAsRead(id: string, userId: string) {
    try {
      return await this.notificationsRepository.markAsRead(id, userId);
    } catch {
      throw new NotFoundException('Notification introuvable.');
    }
  }
}
