import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'kofi.mensah@entreprise.ci', description: 'Adresse e-mail unique' })
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email: string;

  @ApiProperty({ example: 'MonMotDePasse123!', minLength: 8, description: 'Mot de passe (min. 8 caractères)' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  password: string;

  @ApiProperty({ example: 'Kofi' })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis.' })
  firstName: string;

  @ApiProperty({ example: 'Mensah' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis.' })
  lastName: string;

  @ApiProperty({ example: '+225 07 00 00 00 00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-(). ]{7,20}$/, { message: 'Numéro de téléphone invalide.' })
  phone?: string;
}
