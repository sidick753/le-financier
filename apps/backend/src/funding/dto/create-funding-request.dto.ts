import { IsString, IsNumber, IsOptional, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFundingRequestDto {
  @ApiProperty({ example: 'uuid-de-l-organisation', description: 'ID de votre organisation' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ example: 'Financement facture client GIZ — 15 000 000 FCFA', description: 'Titre court et descriptif' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Nous avons une facture GIZ de 15M FCFA payable à 60 jours. Besoin d\'avance pour payer nos fournisseurs.', description: 'Description détaillée + objectif' })
  @IsString()
  description: string;

  @ApiProperty({ example: 15000000, minimum: 1, description: 'Montant demandé en XOF (FCFA)' })
  @IsNumber()
  @Min(1)
  amountRequested: number;

  @ApiProperty({ example: 6.5, minimum: 0, required: false, description: 'Taux de rendement proposé en %' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedReturn?: number;

  @ApiProperty({ example: 2, minimum: 1, required: false, description: 'Durée de remboursement en mois' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMonths?: number;
}
