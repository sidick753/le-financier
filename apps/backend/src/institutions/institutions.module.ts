import { Module } from '@nestjs/common';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { InstitutionsRepository } from './institutions.repository';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [InstitutionsController],
  providers: [InstitutionsService, InstitutionsRepository, RolesGuard],
  exports: [InstitutionsService, InstitutionsRepository],
})
export class InstitutionsModule {}
