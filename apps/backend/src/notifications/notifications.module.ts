import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsGateway } from './notifications.gateway';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    // registerAsync + ConfigService (et non process.env lu en synchrone à l'import)
    // pour garantir le même secret que celui utilisé par AuthModule pour signer
    // les tokens — sinon la vérification du JWT échoue systématiquement dans
    // NotificationsGateway.handleConnection() et chaque socket est déconnecté
    // aussitôt connecté, silencieusement.
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev_secret_change_me',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    MailModule,
    PushModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsGateway,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
