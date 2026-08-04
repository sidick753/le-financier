import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsGateway } from './notifications.gateway';
import { UsersRepository } from '../users/users.repository';
import { MailService, renderEmail } from '../mail/mail.service';

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
  ) {}

  async notify(userId: string, title: string, body: string, link?: string, options?: NotifyOptions) {
    const notification = await this.notificationsRepository.create({
      userId,
      title,
      body,
      link,
    });

    this.notificationsGateway.emitToUser(userId, 'notification', notification);

    if (options?.email) {
      const user = await this.usersRepository.findById(userId);
      if (user) {
        const cta = link ? { label: options.ctaLabel ?? 'Voir sur LeFinancier', url: link } : undefined;
        await this.mailService.send(user.email, title, renderEmail(title, body, cta));
      }
    }

    return notification;
  }

  async notifyAdmins(title: string, body: string) {
    const adminIds = await this.usersRepository.findAdminIds();
    await Promise.all(adminIds.map((adminId) => this.notify(adminId, title, body)));
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
