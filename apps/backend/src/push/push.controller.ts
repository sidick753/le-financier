import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Push')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  @ApiOperation({
    summary: 'Clé publique VAPID',
    description: "À passer à PushManager.subscribe({ applicationServerKey }) côté navigateur.",
  })
  @ApiResponse({ status: 200, description: '{ publicKey: string }' })
  @Get('vapid-public-key')
  getPublicKey() {
    return { publicKey: this.pushService.publicKey };
  }

  @ApiOperation({
    summary: "Enregistrer un abonnement push",
    description: "Appelé après PushManager.subscribe() côté navigateur, avec l'objet retourné (endpoint + keys).",
  })
  @ApiResponse({ status: 201, description: 'Abonnement enregistré' })
  @Post('subscribe')
  subscribe(@Body() dto: SubscribePushDto, @Request() req) {
    return this.pushService.subscribe(req.user.id, dto.endpoint, dto.keys.p256dh, dto.keys.auth, dto.userAgent);
  }

  @ApiOperation({ summary: 'Retirer un abonnement push (désactivation depuis Paramètres, ou navigateur qui se désabonne)' })
  @ApiResponse({ status: 200, description: 'Abonnement supprimé (silencieux si déjà absent)' })
  @Post('unsubscribe')
  unsubscribe(@Body() dto: UnsubscribePushDto, @Request() req) {
    return this.pushService.unsubscribe(req.user.id, dto.endpoint);
  }
}
