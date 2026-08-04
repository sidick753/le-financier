import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlatformBankAccountDto {
  @ApiProperty({ example: 'Ecobank Côte d\'Ivoire' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ example: 'LeFinancier SAS' })
  @IsString()
  @IsNotEmpty()
  accountHolder: string;

  @ApiProperty({ example: 'CI93 CI135 01023 00456789012 34' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: 'ECOCCIAB', required: false })
  @IsOptional()
  @IsString()
  swiftCode?: string;
}
