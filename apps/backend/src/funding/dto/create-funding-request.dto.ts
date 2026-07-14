import { IsString, IsNumber, IsOptional, Min, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FundingCategoryDto {
  FACTURE = 'FACTURE',
  PRET    = 'PRET',
  EQUITY  = 'EQUITY',
}

export enum FundingInvestorModeDto {
  SINGLE_INVESTOR    = 'SINGLE_INVESTOR',
  MULTIPLE_INVESTORS = 'MULTIPLE_INVESTORS',
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

  @ApiPropertyOptional({
    enum: FundingInvestorModeDto,
    default: FundingInvestorModeDto.MULTIPLE_INVESTORS,
    description: "Ouvert à plusieurs investisseurs (par défaut) ou réservé à un seul investisseur finançant 100% du montant.",
  })
  @IsOptional()
  @IsEnum(FundingInvestorModeDto)
  investorMode?: FundingInvestorModeDto;

  // --- FACTURE : ce débiteur, cette facture précise ---
  // (le profil de la PME elle-même — secteur, santé financière, dirigeant, équipe —
  // vit sur Organization et n'est plus redemandé à chaque demande de financement)
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

  // --- PRET : la garantie offerte pour ce prêt précis ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  garantieType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  garantieCouverture?: number;
}
