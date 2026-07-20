import { IsUUID, IsNumber, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    example: 'Garantie hypothécaire souhaitée sur l\'actif financé.',
    maxLength: 1000,
    description: 'Conditions particulières proposées à la création de l\'offre — modifiables lors des contre-propositions suivantes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditions?: string;

  @ApiPropertyOptional({
    example: 'Premier contact avec cette PME, taux aligné sur le secteur.',
    maxLength: 1000,
    description: 'Message libre accompagnant la proposition initiale.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
