import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'MonAncienMotDePasse123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'MonNouveauMotDePasse456!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
