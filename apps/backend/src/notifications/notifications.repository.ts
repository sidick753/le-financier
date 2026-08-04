import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
import {
  INotificationsRepository,
  CreateNotificationData,
} from './interfaces/notifications-repository.interface';

@Injectable()
export class NotificationsRepository implements INotificationsRepository {
  private prisma = new PrismaClient();

  async create(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        link: data.link,
        channel: data.channel ?? 'IN_APP',
      },
    });
  }

  async findAllByUserId(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }
}
