import { IsString, IsNumber, IsOptional, Min, IsUUID, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FundingCategoryDto {
  FACTURE = 'FACTURE',
  PRET    = 'PRET',
  EQUITY  = 'EQUITY',
}

export class CreateFundingRequestDto {
  @ApiProperty({ example: 'uuid-de-l-organisation' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ example: 'Financement facture client GIZ — 15 000 000 FCFA' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Besoin d\'avance pour payer nos fournisseurs.' })
  @IsString()
  description: string;

  @ApiProperty({ enum: FundingCategoryDto, example: FundingCategoryDto.PRET })
  @IsEnum(FundingCategoryDto)
  category: FundingCategoryDto;

  @ApiProperty({ example: 15000000, minimum: 1 })
  @IsNumber()
  @Min(1)
  amountRequested: number;

  @ApiPropertyOptional({ example: 6.5, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedReturn?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMonths?: number;

  // --- Données FACTURE ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debiteurNom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debiteurType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debiteurSolvabilite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  echeanceFactureDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ancienneteRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  partPlusGrosClient?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  delaiPaiementMenu?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  tauxImpaye12m?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  nbClientsActifs?: number;

  // --- Données PRET MLT ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cashFlowAnnuel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fluxMobileMoneyMensuel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  autonomieFinanciere?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tauxEndettement?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ratioLiquidite?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  garantieType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  garantieCouverture?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dirigeantExperienceAns?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dirigeantAntecedents?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dirigeantIncidentsLegaux?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secteurCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  secteurSaisonnalite?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  secteurImportDevises?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  secteurSoutienPublic?: boolean;

  // --- Données EQUITY ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tcamCa3ans?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tailleMarche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scalabilite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  experienceSecteurAns?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackRecord?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completudeEquipe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partMarcheRelative?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  runwayMois?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  margeBrute?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  droitsInvestisseur?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transparence?: string;
}
