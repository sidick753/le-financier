import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Informations bancaires de la PME — utilisées pour le versement des fonds
// levés (prêts et equity), une fois la commission plateforme déduite.
export class UpdateBankInfoDto {
  @ApiPropertyOptional({ example: 'Ecobank Côte d\'Ivoire' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'KAWA Services SARL' })
  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @ApiPropertyOptional({ example: 'CI93 CI135 01023 00456789012 34' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: 'ECOCCIAB' })
  @IsOptional()
  @IsString()
  bankSwiftCode?: string;
}
