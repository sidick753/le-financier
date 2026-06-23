import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto, @Request() req) {
    return this.organizationsService.create(dto, req.user.id);
  }

  @Get('mine')
  findMine(@Request() req) {
    return this.organizationsService.findMine(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.organizationsService.findOneOrThrow(id, req.user.id);
  }
}
