import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInstitutionLimitsDto {
  @ApiProperty({ example: 1_000_000_000, required: false, description: 'Enveloppe annuelle max (FCFA)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  envelopeMax?: number;

  @ApiProperty({ example: 25_000_000, required: false, description: 'Ticket minimum (FCFA)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ticketMin?: number;

  @ApiProperty({ example: 500_000_000, required: false, description: 'Ticket maximum (FCFA)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ticketMax?: number;

  @ApiProperty({ example: ['Tabac', 'Armement'], required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedSectors?: string[];
}
