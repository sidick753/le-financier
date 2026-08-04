import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PlatformBankAccountsService } from './platform-bank-accounts.service';
import { CreatePlatformBankAccountDto } from './dto/create-platform-bank-account.dto';
import { UpdatePlatformBankAccountDto } from './dto/update-platform-bank-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Platform Bank Accounts')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('platform-bank-accounts')
export class PlatformBankAccountsController {
  constructor(private platformBankAccountsService: PlatformBankAccountsService) {}

  @ApiOperation({
    summary: '[ADMIN] Créer un compte bancaire plateforme',
    description: "Compte vers lequel les investisseurs virent leurs fonds une fois un engagement confirmé — jamais le compte d'une PME.",
  })
  @ApiResponse({ status: 201, description: 'Compte créé' })
  @Post()
  create(@Body() dto: CreatePlatformBankAccountDto) {
    return this.platformBankAccountsService.create(dto);
  }

  @ApiOperation({ summary: '[ADMIN] Liste des comptes bancaires plateforme', description: 'Inclut les comptes désactivés.' })
  @ApiResponse({ status: 200, description: 'Liste de comptes' })
  @Get()
  findAll() {
    return this.platformBankAccountsService.findAll();
  }

  @ApiOperation({ summary: '[ADMIN] Modifier un compte bancaire plateforme', description: 'Permet aussi de désactiver le compte (isActive) sans le supprimer.' })
  @ApiParam({ name: 'id', description: 'UUID du compte' })
  @ApiResponse({ status: 200, description: 'Compte modifié' })
  @ApiResponse({ status: 404, description: 'Compte introuvable' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlatformBankAccountDto) {
    return this.platformBankAccountsService.update(id, dto);
  }

  @ApiOperation({ summary: '[ADMIN] Supprimer un compte bancaire plateforme' })
  @ApiParam({ name: 'id', description: 'UUID du compte' })
  @ApiResponse({ status: 200, description: 'Compte supprimé' })
  @ApiResponse({ status: 404, description: 'Compte introuvable' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.platformBankAccountsService.remove(id);
  }
}
