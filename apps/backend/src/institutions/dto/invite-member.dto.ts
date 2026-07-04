import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'a.koffi@banque-atlantique.ci' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Adjoua' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Koffi' })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: ['OWNER', 'ANALYST', 'COMPLIANCE'], example: 'ANALYST' })
  @IsIn(['OWNER', 'ANALYST', 'COMPLIANCE'])
  role: 'OWNER' | 'ANALYST' | 'COMPLIANCE';

  @ApiProperty({ example: 'Analyste Junior', required: false })
  @IsOptional()
  @IsString()
  specialty?: string;
}
