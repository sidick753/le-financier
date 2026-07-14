import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsGateway } from './notifications.gateway';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private notificationsRepository: NotificationsRepository,
    private notificationsGateway: NotificationsGateway,
    private usersRepository: UsersRepository,
  ) {}

  async notify(userId: string, title: string, body: string) {
    const notification = await this.notificationsRepository.create({
      userId,
      title,
      body,
    });

    this.notificationsGateway.emitToUser(userId, 'notification', notification);

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
