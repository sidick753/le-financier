import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Informations personnelles de l'utilisateur connecté — communes aux 4 rôles
// (PME_OWNER, INVESTOR, INSTITUTION, ADMIN). L'email (identifiant de connexion)
// n'est volontairement pas modifiable ici.
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Kofi' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le prénom ne peut pas être vide.' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Mensah' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le nom ne peut pas être vide.' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+225 07 00 00 00 00' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-(). ]{7,20}$/, { message: 'Numéro de téléphone invalide.' })
  phone?: string;

  @ApiPropertyOptional({ example: 'CI0012345678', description: 'Numéro de CNI (rôle INVESTOR)' })
  @IsOptional()
  @IsString()
  cniNumber?: string;
}
