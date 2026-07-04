import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInstitutionProfileDto {
  @ApiProperty({ example: 'Banque Atlantique CI', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Banque commerciale', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: 'CI-B-2010-001', required: false, description: "Numéro d'agrément BCEAO" })
  @IsOptional()
  @IsString()
  bceaoApprovalNumber?: string;

  @ApiProperty({ example: 'CI', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'Plateau, Avenue Botreau Roussel', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'contact@banque-atlantique.ci', required: false })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ example: '+225 20 20 20 20', required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}
