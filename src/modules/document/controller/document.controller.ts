import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { MAX_DOCUMENT_FILE_SIZE_BYTES } from '@/modules/document/constants';
import { ApiDocumentUploadBody } from '@/modules/document/controller/document-upload-body.decorator';
import {
  AppendDocumentChunkEmbeddingsDto,
  AppendDocumentChunkEmbeddingsResponseDto,
  AppendDocumentChunksDto,
  AppendDocumentChunksResponseDto,
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

  @Get(':documentId/download')
  @Authenticated()
  @ApiOperation({ summary: 'Download project document file' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Document file stream',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async downloadDocument(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.usecase.downloadDocument(
      String(user.sub),
      projectId,
      documentId,
    );

    res.set({
      // Always serve as an attachment stream so clients download to disk
      // instead of rendering inline; the real type is kept for reference.
      'Content-Type': 'application/octet-stream',
      'X-Document-Content-Type': file.contentType,
      'Content-Length': String(file.body.length),
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
    });

    return new StreamableFile(file.body);
  }

  @Post(':documentId/chunks')
  @Authenticated()
  @ApiOperation({ summary: 'Append document chunks' })
  @ApiDataResponse(AppendDocumentChunksResponseDto, {
    status: HttpStatus.CREATED,
  })
  async appendDocumentChunks(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Body() dto: AppendDocumentChunksDto,
  ): Promise<AppendDocumentChunksResponseDto> {
    return this.usecase.appendDocumentChunks(
      String(user.sub),
      projectId,
      documentId,
      dto,
    );
  }

  @Post(':documentId/chunks/embeddings')
  @Authenticated()
  @ApiOperation({ summary: 'Append document chunk embeddings' })
  @ApiDataResponse(AppendDocumentChunkEmbeddingsResponseDto, {
    status: HttpStatus.CREATED,
  })
  async appendDocumentChunkEmbeddings(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @Body() dto: AppendDocumentChunkEmbeddingsDto,
  ): Promise<AppendDocumentChunkEmbeddingsResponseDto> {
    return this.usecase.appendDocumentChunkEmbeddings(
      String(user.sub),
      projectId,
      documentId,
      dto,
    );
  }

  @Delete(':documentId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project document' })
  @ApiNoContentResponse({ description: 'Successfully deleted document' })
  async deleteDocument(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    await this.usecase.deleteDocument(String(user.sub), projectId, documentId);
  }
}
