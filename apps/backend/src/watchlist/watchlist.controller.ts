import { Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WatchlistService } from './watchlist.service';

@ApiTags('Watchlist')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private watchlistService: WatchlistService) {}

  @ApiOperation({ summary: 'Ajouter aux favoris' })
  @ApiParam({ name: 'fundingRequestId', description: 'UUID de la demande' })
  @ApiResponse({ status: 201, description: 'Ajouté aux favoris' })
  @Post(':fundingRequestId')
  add(@Param('fundingRequestId') fundingRequestId: string, @Request() req) {
    return this.watchlistService.add(req.user.id, fundingRequestId);
  }

  @ApiOperation({ summary: 'Retirer des favoris' })
  @ApiParam({ name: 'fundingRequestId', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Retiré des favoris' })
  @Delete(':fundingRequestId')
  remove(@Param('fundingRequestId') fundingRequestId: string, @Request() req) {
    return this.watchlistService.remove(req.user.id, fundingRequestId);
  }

  @ApiOperation({ summary: 'Mes favoris' })
  @ApiResponse({ status: 200, description: 'Liste des opportunités en favoris' })
  @Get()
  findMine(@Request() req) {
    return this.watchlistService.findByInvestor(req.user.id);
  }

  @ApiOperation({ summary: 'Statut favori pour une opportunité' })
  @ApiParam({ name: 'fundingRequestId', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: '{ favorited: boolean }' })
  @Get(':fundingRequestId/status')
  getStatus(@Param('fundingRequestId') fundingRequestId: string, @Request() req) {
    return this.watchlistService.getStatus(req.user.id, fundingRequestId);
  }
}
