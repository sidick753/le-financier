import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { ScoringRepository } from './scoring.repository';

@Module({
  providers: [ScoringService, ScoringRepository],
  exports: [ScoringService],
})
export class ScoringModule {}
