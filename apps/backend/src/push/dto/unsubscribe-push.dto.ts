import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnsubscribePushDto {
  @ApiProperty({ description: "Endpoint de la souscription à supprimer." })
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}
