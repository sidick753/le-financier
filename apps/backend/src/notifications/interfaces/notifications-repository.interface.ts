import { Notification } from '@le-financier/database';

export interface CreateNotificationData {
  userId: string;
  title: string;
  body: string;
  channel?: 'EMAIL' | 'IN_APP';
}

export interface INotificationsRepository {
  create(data: CreateNotificationData): Promise<Notification>;
  findAllByUserId(userId: string): Promise<Notification[]>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<Notification>;
}
