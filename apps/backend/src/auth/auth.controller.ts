import { Body, Controller, Post, Get, Patch, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { parsePositiveInt } from '../common/pagination.util';

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

  @ApiOperation({ summary: 'Connexion', description: 'Retourne un `accessToken` (15 min) + un `refreshToken` opaque (7 jours, stocké en DB).' })
  @ApiResponse({ status: 200, description: '{ accessToken, refreshToken, expiresIn, user }' })
  @ApiResponse({ status: 401, description: 'Identifiants incorrects' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Renouveler l\'access token via le refresh token (rotation automatique)' })
  @ApiResponse({ status: 200, description: '{ accessToken, refreshToken, expiresIn, user }' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide, révoqué ou expiré' })
  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @ApiOperation({ summary: 'Déconnexion — révoque le refresh token' })
  @ApiResponse({ status: 200, description: '{ message: string }' })
  @Post('logout')
  logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
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
  @ApiOperation({ summary: 'Changer mon mot de passe', description: 'Révoque toutes les sessions existantes (refresh tokens) après le changement.' })
  @ApiResponse({ status: 200, description: '{ message: string }' })
  @ApiResponse({ status: 401, description: 'Mot de passe actuel incorrect' })
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: '[Admin] Liste tous les utilisateurs', description: 'Filtre optionnel par rôle (CSV, ex: INVESTOR,INSTITUTION), recherche par nom/email, avec pagination.' })
  @ApiQuery({ name: 'role', required: false, description: 'Rôle(s), séparés par une virgule' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (retourne tout si absent)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Taille de page (retourne tout si absent)' })
  @ApiResponse({ status: 200, description: '{ data: User[], total: number }' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/users')
  getAllUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.authService.getAllUsers({
      role,
      search,
      page: parsePositiveInt(page),
      limit: parsePositiveInt(limit),
    });
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: '[Admin] Stats investisseurs', description: 'Retourne les compteurs globaux : total, institutions, particuliers, engagements totaux.' })
  @ApiResponse({ status: 200, description: '{ total, institutions, particuliers, totalEngaged }' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/users/investor-stats')
  getInvestorStats() {
    return this.authService.getInvestorStats();
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: '[Admin] Détail complet d\'un utilisateur', description: 'Retourne l\'utilisateur avec ses investissements et, pour une institution, son rattachement.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.authService.getUserAdminDetail(id);
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
