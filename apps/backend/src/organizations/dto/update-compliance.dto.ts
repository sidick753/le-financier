import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// [Admin] Statut LAB-CFT saisi manuellement lors de la revue KYC de la PME.
export class UpdateComplianceDto {
  @ApiProperty({ example: false, description: 'Le dirigeant est une personne politiquement exposée (PEP).' })
  @IsBoolean()
  dirigeantEstPep: boolean;
}
