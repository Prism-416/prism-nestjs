import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  DocumentSummaryResponseDto,
  SearchDocumentsQueryDto,
  SearchDocumentsResponseDto,
} from '@/modules/document/dto';
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
