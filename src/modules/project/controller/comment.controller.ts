import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { MAX_DOCUMENT_FILE_SIZE_BYTES } from '@/modules/document/constants';
import type { DocumentUploadFile } from '@/modules/document/types';
import {
  CommentResponseDto,
  CreateCommentDto,
  SearchCommentsQueryDto,
  SearchCommentsResponseDto,
  UpsertWorkItemCommentEmbeddingDto,
  WorkItemCommentEmbeddingResponseDto,
} from '@/modules/project/dto';
import { CommentUseCase } from '@/modules/project/usecases';

@ApiTags('Project Work Item Comment')
@Controller(':projectId/work-items/:itemId/comments')
export class CommentController {
  constructor(private readonly usecase: CommentUseCase) {}

  @Post()
  @Authenticated()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Create work item comment' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          maxLength: 2000,
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiDataResponse(CommentResponseDto, { status: HttpStatus.CREATED })
  async createWorkItemComment(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files?: DocumentUploadFile[],
  ): Promise<CommentResponseDto> {
    return this.usecase.createWorkItemComment(
      String(user.sub),
      projectId,
      itemId,
      dto,
      files,
    );
  }

  @Patch(':commentId')
  @Authenticated()
  @ApiOperation({ summary: 'Update work item comment' })
  @ApiDataResponse(CommentResponseDto)
  async updateWorkItemComment(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.usecase.updateWorkItemComment(
      String(user.sub),
      projectId,
      itemId,
      commentId,
      dto,
    );
  }

  @Delete(':commentId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete work item comment' })
  @ApiNoContentResponse({ description: 'Successfully deleted comment' })
  async deleteWorkItemComment(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    await this.usecase.deleteWorkItemComment(
      String(user.sub),
      projectId,
      itemId,
      commentId,
    );
  }

  @Put(':commentId/embedding')
  @Authenticated()
  @ApiOperation({ summary: 'Upsert work item comment embedding' })
  @ApiDataResponse(WorkItemCommentEmbeddingResponseDto)
  async upsertWorkItemCommentEmbedding(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpsertWorkItemCommentEmbeddingDto,
  ): Promise<WorkItemCommentEmbeddingResponseDto> {
    return this.usecase.upsertWorkItemCommentEmbedding(
      String(user.sub),
      projectId,
      itemId,
      commentId,
      dto,
    );
  }

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Search work item comments' })
  @ApiDataResponse(SearchCommentsResponseDto)
  async searchWorkItemComments(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Query() query: SearchCommentsQueryDto,
  ): Promise<SearchCommentsResponseDto> {
    return this.usecase.searchWorkItemComments(
      String(user.sub),
      projectId,
      itemId,
      query,
    );
  }
}
