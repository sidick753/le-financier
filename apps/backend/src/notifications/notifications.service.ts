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
      const user = await this.usersRepository.findById(userId);
      if (user) {
        const cta = link ? { label: options.ctaLabel ?? 'Voir sur LeFinancier', url: link } : undefined;
        await this.mailService.send(user.email, title, renderEmail(title, body, cta));
      }
    }

    return notification;
  }

  async notifyAdmins(title: string, body: string, link?: string, options?: NotifyOptions) {
    const adminIds = await this.usersRepository.findAdminIds();
    await Promise.all(adminIds.map((adminId) => this.notify(adminId, title, body, link, options)));
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
