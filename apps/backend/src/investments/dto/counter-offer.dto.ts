import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CounterOfferDto {
  @ApiProperty({ example: 7.5, minimum: 0, maximum: 100, description: 'Nouveau taux de rendement proposé (en %)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  proposedReturn: number;
}
