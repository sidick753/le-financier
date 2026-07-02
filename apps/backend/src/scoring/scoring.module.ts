import { Module } from '@nestjs/common';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';
import { ScoringRepository } from './scoring.repository';

@Module({
  controllers: [ScoringController],
  providers: [ScoringService, ScoringRepository],
  exports: [ScoringService],
})
export class ScoringModule {}
