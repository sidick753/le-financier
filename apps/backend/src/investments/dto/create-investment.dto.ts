import { IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvestmentDto {
  @ApiProperty({ example: 'uuid-de-la-demande-de-financement', description: 'ID de la demande de financement (doit être en statut PUBLISHED)' })
  @IsUUID()
  fundingRequestId: string;

  @ApiProperty({ example: 5000000, minimum: 1, description: 'Montant engagé en XOF (FCFA) — ne peut pas dépasser le reste à lever' })
  @IsNumber()
  @Min(1)
  amountCommitted: number;

  @ApiProperty({ example: 8.5, minimum: 0, maximum: 100, description: 'Taux de rendement proposé par l\'investisseur (en %)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  proposedReturn: number;
}
