import { Injectable } from '@nestjs/common';
import {
  DocumentSummaryResponseDto,
  SearchDocumentsQueryDto,
  SearchDocumentsResponseDto,
} from '@/modules/document/dto';
import {
  DocumentNotFoundError,
  DocumentProjectNotFoundError,
} from '@/modules/document/errors';
import { DocumentRepository } from '@/modules/document/repository';

@Injectable()
export class DocumentUseCase {
  constructor(private readonly repo: DocumentRepository) {}

  async searchDocuments(
    userId: string,
    projectId: string,
    query: SearchDocumentsQueryDto,
  ): Promise<SearchDocumentsResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    return this.repo.searchDocuments({
      projectId: project.projectId,
      query: query.query,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  async getDocument(
    userId: string,
    projectId: string,
    documentId: string,
  ): Promise<DocumentSummaryResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new DocumentProjectNotFoundError();
    }

    const document = await this.repo.findDocumentById(
      project.projectId,
      documentId,
    );
    if (!document) {
      throw new DocumentNotFoundError();
    }

    return document;
  }
}
