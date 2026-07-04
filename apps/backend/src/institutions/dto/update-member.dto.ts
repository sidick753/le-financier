import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberDto {
  @ApiProperty({ enum: ['OWNER', 'ANALYST', 'COMPLIANCE'], required: false })
  @IsOptional()
  @IsIn(['OWNER', 'ANALYST', 'COMPLIANCE'])
  role?: 'OWNER' | 'ANALYST' | 'COMPLIANCE';

  @ApiProperty({ enum: ['ACTIVE', 'TRAINING'], required: false })
  @IsOptional()
  @IsIn(['ACTIVE', 'TRAINING'])
  status?: 'ACTIVE' | 'TRAINING';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialty?: string;
}
