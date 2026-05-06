import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  SearchCommentsQueryDto,
  SearchCommentsResponseDto,
} from '@/modules/project/dto';
import { CommentUseCase } from '@/modules/project/usecases';

@ApiTags('Project Work Item Comment')
@Controller(':projectId/work-items/:itemId/comments')
export class CommentController {
  constructor(private readonly usecase: CommentUseCase) {}

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
