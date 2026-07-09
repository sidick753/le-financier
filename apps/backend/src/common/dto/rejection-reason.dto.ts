import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectionReasonDto {
  @ApiProperty({ example: 'Documents incomplets', description: 'Motif du rejet, communiqué à la PME' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
