import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  legalName: string;

  @IsString()
  registrationNumber: string;

  @IsString()
  sector: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  foundedYear?: number;

  @IsOptional()
  @IsString()
  legalForm?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
