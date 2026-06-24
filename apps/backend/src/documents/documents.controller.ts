import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsRepository } from '../organizations/organizations.repository';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private organizationsRepository: OrganizationsRepository,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @Request() req,
  ) {
    if (dto.organizationId) {
      const isMember = await this.organizationsRepository.isMember(
        dto.organizationId,
        req.user.id,
      );
      if (!isMember) {
        throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
      }
    }

    return this.documentsService.upload(file, dto, req.user.id);
  }

  @Get(':id/download-url')
  getDownloadUrl(@Param('id') id: string, @Request() req) {
    return this.documentsService.getDownloadUrl(id, req.user.id);
  }

  @Get('organization/:organizationId')
  async findAllByOrganization(
    @Param('organizationId') organizationId: string,
    @Request() req,
  ) {
    const isMember = await this.organizationsRepository.isMember(
      organizationId,
      req.user.id,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }
    return this.documentsService.findAllByOrganizationId(organizationId);
  }
}
