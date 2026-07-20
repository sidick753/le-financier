import { IsNumber, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CounterOfferDto {
  @ApiProperty({ example: 7.5, minimum: 0, maximum: 100, description: 'Nouveau taux de rendement proposé (en %)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  proposedReturn: number;

  @ApiPropertyOptional({
    example: 'Garantie hypothécaire souhaitée sur l\'actif financé.',
    maxLength: 1000,
    description: 'Conditions proposées à ce tour de négociation — remplace les conditions actuelles de l\'engagement si fourni, sinon elles restent inchangées.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditions?: string;

  @ApiPropertyOptional({
    example: 'Taux aligné sur votre dernier bilan, ouvert à discussion sur le calendrier.',
    maxLength: 1000,
    description: 'Message libre accompagnant cette proposition.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
