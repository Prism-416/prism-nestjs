import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { MAX_DOCUMENT_FILE_SIZE_BYTES } from '@/modules/document/constants';
import { ApiDocumentDownloadResponse } from '@/modules/document/controller/document-download-response.decorator';
import { sendDocumentDownloadResponse } from '@/modules/document/controller/document-download-response';
import { ApiDocumentUploadBody } from '@/modules/document/controller/document-upload-body.decorator';
import {
  DocumentSummaryResponseDto,
  SearchDocumentsQueryDto,
  SearchDocumentsResponseDto,
  UploadDocumentDto,
} from '@/modules/document/dto';
import type { DocumentUploadFile } from '@/modules/document/types';
import { DocumentUseCase } from '@/modules/document/usecases';

@ApiTags('Project Document')
@Controller(':projectId/documents')
export class DocumentController {
  constructor(private readonly usecase: DocumentUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Search project documents' })
  @ApiDataResponse(SearchDocumentsResponseDto)
  async searchDocuments(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Query() query: SearchDocumentsQueryDto,
  ): Promise<SearchDocumentsResponseDto> {
    return this.usecase.searchDocuments(String(user.sub), projectId, query);
  }

  @Post()
  @Authenticated()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Upload project document' })
  @ApiDocumentUploadBody()
  @ApiDataResponse(DocumentSummaryResponseDto, { status: HttpStatus.CREATED })
  async uploadDocument(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: DocumentUploadFile,
  ): Promise<DocumentSummaryResponseDto> {
    return this.usecase.uploadDocument(String(user.sub), projectId, dto, file);
  }

  @Get(':documentId/download')
  @Authenticated()
  @ApiOperation({ summary: 'Download project document file' })
  @ApiDocumentDownloadResponse()
  async downloadDocument(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const download = await this.usecase.downloadDocument(
      String(user.sub),
      projectId,
      documentId,
    );

    await sendDocumentDownloadResponse(res, download);
  }

  @Get(':documentId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve project document metadata' })
  @ApiDataResponse(DocumentSummaryResponseDto)
  async getDocument(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
  ): Promise<DocumentSummaryResponseDto> {
    return this.usecase.getDocument(String(user.sub), projectId, documentId);
  }
}
