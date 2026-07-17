import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RequestClaimDto {
  @ApiPropertyOptional({
    description: 'Montant réclamé. Si omis, réclame la totalité du montant disponible.',
    example: 500000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
