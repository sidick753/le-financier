import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Mes notifications', description: 'Retourne toutes les notifications in-app de l\'utilisateur courant, triées par date décroissante.' })
  @ApiResponse({ status: 200, description: '{ id, title, body, readAt, createdAt }[]' })
  @Get()
  findMine(@Request() req) {
    return this.notificationsService.findMine(req.user.id);
  }

  @ApiOperation({ summary: 'Compteur de notifications non lues', description: 'Retourne le nombre de notifications dont `readAt` est null.' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  @Get('unread-count')
  countUnread(@Request() req) {
    return this.notificationsService.countUnread(req.user.id);
  }

  @ApiOperation({ summary: 'Marquer une notification comme lue', description: 'Met à jour `readAt` à now(). Seule la notification appartenant à l\'utilisateur courant peut être modifiée.' })
  @ApiParam({ name: 'id', description: 'UUID de la notification' })
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue' })
  @ApiResponse({ status: 403, description: 'La notification appartient à un autre utilisateur' })
  @ApiResponse({ status: 404, description: 'Notification introuvable' })
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
