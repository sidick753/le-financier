import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Mensah & Associés SARL', description: 'Dénomination sociale complète' })
  @IsString()
  legalName: string;

  @ApiProperty({ example: 'CI-ABJ-2019-B-12345', description: 'Numéro RCCM ou équivalent' })
  @IsString()
  registrationNumber: string;

  @ApiProperty({ example: 'Agroalimentaire', description: "Secteur d'activité" })
  @IsString()
  sector: string;

  @ApiProperty({ example: 2019, minimum: 1900, maximum: 2100, required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  foundedYear?: number;

  @ApiProperty({ example: 'SARL', required: false, description: 'Forme juridique' })
  @IsOptional()
  @IsString()
  legalForm?: string;

  @ApiProperty({ example: 'Rue des Jardins, Cocody', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Abidjan', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'commerce_detail',
    required: false,
    description: "Classification sectorielle utilisée par le moteur de scoring PRET (distincte du champ `sector` descriptif) : services_essentiels | agro | commerce_detail | btp | import_export | commerce_mono | volatil",
  })
  @IsOptional()
  @IsString()
  secteurCode?: string;
}
