import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis.' })
  lastName: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-(). ]{7,20}$/, { message: 'Numéro de téléphone invalide.' })
  phone?: string;
}
