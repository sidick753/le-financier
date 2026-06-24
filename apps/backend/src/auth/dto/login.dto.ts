import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'kofi.mensah@entreprise.ci' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MonMotDePasse123!' })
  @IsString()
  password: string;
}
