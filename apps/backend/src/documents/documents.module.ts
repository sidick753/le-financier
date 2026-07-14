import { Module, forwardRef } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsRepository } from './documents.repository';
import { StorageService } from './storage/storage.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { FundingModule } from '../funding/funding.module';

@Module({
  imports: [OrganizationsModule, forwardRef(() => FundingModule)],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository, StorageService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
