import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FundingCategoryDto, FundingInvestorModeDto } from './create-funding-request.dto';

export class UpdateFundingRequestDto {
  @ApiPropertyOptional({ example: 'Financement facture client GIZ — 15 000 000 FCFA' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: "Besoin d'avance pour payer nos fournisseurs." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: FundingCategoryDto })
  @IsOptional()
  @IsEnum(FundingCategoryDto)
  category?: FundingCategoryDto;

  @ApiPropertyOptional({ example: 15000000, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amountRequested?: number;

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

  @ApiPropertyOptional({ enum: FundingInvestorModeDto })
  @IsOptional()
  @IsEnum(FundingInvestorModeDto)
  investorMode?: FundingInvestorModeDto;
}
