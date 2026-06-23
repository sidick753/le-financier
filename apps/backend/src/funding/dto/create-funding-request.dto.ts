import { IsString, IsNumber, IsOptional, Min, IsUUID } from 'class-validator';

export class CreateFundingRequestDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  amountRequested: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedReturn?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMonths?: number;
}
