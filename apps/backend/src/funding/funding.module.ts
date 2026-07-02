import { Module } from '@nestjs/common';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';
import { FundingRepository } from './funding.repository';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [OrganizationsModule, ScoringModule],
  controllers: [FundingController],
  providers: [FundingService, FundingRepository],
  exports: [FundingRepository],
})
export class FundingModule {}
