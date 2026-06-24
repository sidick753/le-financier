import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Inscription PME Owner', description: 'Crée un compte utilisateur avec le rôle PME_OWNER. Vous pourrez ensuite créer une organisation.' })
  @ApiResponse({ status: 201, description: 'Compte créé — retourne { accessToken, user }' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @Post('register/pme-owner')
  registerPmeOwner(@Body() dto: RegisterDto) {
    return this.authService.registerPmeOwner(dto);
  }

  @ApiOperation({ summary: 'Inscription Investisseur', description: 'Crée un compte avec le rôle INVESTOR.' })
  @ApiResponse({ status: 201, description: 'Compte créé — retourne { accessToken, user }' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @Post('register/investor')
  registerInvestor(@Body() dto: RegisterDto) {
    return this.authService.registerInvestor(dto);
  }

  @ApiOperation({ summary: 'Inscription Institution financière', description: 'Crée un compte avec le rôle INSTITUTION.' })
  @ApiResponse({ status: 201, description: 'Compte créé — retourne { accessToken, user }' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @Post('register/institution')
  registerInstitution(@Body() dto: RegisterDto) {
    return this.authService.registerInstitution(dto);
  }

  @ApiOperation({ summary: 'Connexion', description: 'Retourne un JWT `accessToken` valable 7 jours.' })
  @ApiResponse({ status: 200, description: '{ accessToken: string, user: { id, email, role, ... } }' })
  @ApiResponse({ status: 401, description: 'Identifiants incorrects' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Profil courant', description: 'Retourne les informations du user authentifié (injectées par le JWT).' })
  @ApiResponse({ status: 200, description: '{ id, email, firstName, lastName, role, kycStatus }' })
  @ApiResponse({ status: 401, description: 'Token manquant ou expiré' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }
}
