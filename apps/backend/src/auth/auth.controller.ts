import { Body, Controller, Post, Get, Patch, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

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

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: '[Admin] Liste tous les utilisateurs', description: 'Filtre optionnel par rôle.' })
  @ApiQuery({ name: 'role', required: false, enum: ['PME_OWNER', 'INVESTOR', 'INSTITUTION', 'ADMIN', 'SUPER_ADMIN'] })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/users')
  getAllUsers(@Query('role') role?: string) {
    return this.authService.getAllUsers({ role });
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: '[Admin] Vérifier KYC utilisateur' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'KYC mis à jour à VERIFIED' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/users/:id/verify-kyc')
  verifyUserKyc(@Param('id') id: string) {
    return this.authService.updateUserKyc(id, 'VERIFIED');
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: '[Admin] Rejeter KYC utilisateur' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'KYC mis à jour à REJECTED' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/users/:id/reject-kyc')
  rejectUserKyc(@Param('id') id: string) {
    return this.authService.updateUserKyc(id, 'REJECTED');
  }
}
