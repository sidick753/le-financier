import { Module, forwardRef } from '@nestjs/common';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';
import { FundingRepository } from './funding.repository';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ScoringModule } from '../scoring/scoring.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [OrganizationsModule, ScoringModule, forwardRef(() => DocumentsModule)],
  controllers: [FundingController],
  providers: [FundingService, FundingRepository],
  exports: [FundingRepository],
})
export class FundingModule {}
