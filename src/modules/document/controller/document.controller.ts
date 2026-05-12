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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { MAX_DOCUMENT_FILE_SIZE_BYTES } from '@/modules/document/constants';
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
