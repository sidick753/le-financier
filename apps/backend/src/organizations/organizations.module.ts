import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationsRepository } from './organizations.repository';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScoringModule } from '../scoring/scoring.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScoringModule, NotificationsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsRepository, RolesGuard],
  exports: [OrganizationsRepository],
})
export class OrganizationsModule {}
