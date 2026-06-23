import { Module } from '@nestjs/common';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';
import { FundingRepository } from './funding.repository';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [FundingController],
  providers: [FundingService, FundingRepository],
  exports: [FundingRepository],
})
export class FundingModule {}
