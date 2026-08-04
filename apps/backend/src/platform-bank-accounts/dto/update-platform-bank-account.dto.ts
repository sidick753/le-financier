import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlatformBankAccountDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountHolder?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  swiftCode?: string;

  @ApiProperty({ required: false, description: 'Masque le compte aux investisseurs sans le supprimer.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
