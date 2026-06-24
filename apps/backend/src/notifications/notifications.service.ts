import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private notificationsRepository: NotificationsRepository,
    private notificationsGateway: NotificationsGateway,
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
