import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Identité de l'entreprise — jamais capturée à l'inscription (le formulaire PME
// ne demande que la dénomination sociale et le RCCM) : la PME la complète ici.
export class UpdateIdentityDto {
  @ApiPropertyOptional({ example: 'Agroalimentaire', description: "Secteur d'activité (description libre)" })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ example: 'SARL', description: 'Forme juridique' })
  @IsOptional()
  @IsString()
  legalForm?: string;

  @ApiPropertyOptional({ example: 2019, minimum: 1900, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  foundedYear?: number;

  @ApiPropertyOptional({ example: 'Rue des Jardins, Cocody' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Abidjan' })
  @IsOptional()
  @IsString()
  city?: string;
}
