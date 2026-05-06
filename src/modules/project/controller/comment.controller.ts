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
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  CommentResponseDto,
  CreateCommentDto,
  SearchCommentsQueryDto,
  SearchCommentsResponseDto,
} from '@/modules/project/dto';
import { CommentUseCase } from '@/modules/project/usecases';

@ApiTags('Project Work Item Comment')
@Controller(':projectId/work-items/:itemId/comments')
export class CommentController {
  constructor(private readonly usecase: CommentUseCase) {}

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create work item comment' })
  @ApiDataResponse(CommentResponseDto, { status: HttpStatus.CREATED })
  async createWorkItemComment(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.usecase.createWorkItemComment(
      String(user.sub),
      projectId,
      itemId,
      dto,
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
