import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiDataResponse } from '@/core/response';
import { RequireInternalScopes } from '@/modules/admin';
import {
  CreatePullRequestReviewForInternalDto,
  CreatePullRequestReviewForInternalResponseDto,
  GetPullRequestForInternalQueryDto,
  PullRequestForInternalResponseDto,
} from '@/modules/project/dto';
import { PullRequestUseCase } from '@/modules/project/usecases';

@ApiTags('Project Pull Request')
@Controller(':projectId/pull-requests')
export class PullRequestController {
  constructor(private readonly usecase: PullRequestUseCase) {}

  @Get('internal/:pullNumber')
  @RequireInternalScopes('repositories:read')
  @ApiOperation({
    summary: 'Retrieve pull request content for internal workers',
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'pullNumber', type: Number })
  @ApiDataResponse(PullRequestForInternalResponseDto)
  async getPullRequestForInternal(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('pullNumber', ParseIntPipe) pullNumber: number,
    @Query() query: GetPullRequestForInternalQueryDto,
  ): Promise<PullRequestForInternalResponseDto> {
    return this.usecase.getPullRequestForInternal(projectId, pullNumber, query);
  }

  @Post('internal/:pullNumber/reviews')
  @RequireInternalScopes('pull_requests:write')
  @ApiOperation({
    summary: 'Create pull request review for internal workers',
    description:
      'Invalid review comment path/line anchors return 422 instead of being dropped.',
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'pullNumber', type: Number })
  @ApiConflictResponse({
    description:
      'Pull request head SHA no longer matches the submitted review.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'A review comment path or line is not present in the PR diff.',
  })
  @ApiDataResponse(CreatePullRequestReviewForInternalResponseDto, {
    status: HttpStatus.CREATED,
  })
  async createPullRequestReviewForInternal(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('pullNumber', ParseIntPipe) pullNumber: number,
    @Body() dto: CreatePullRequestReviewForInternalDto,
  ): Promise<CreatePullRequestReviewForInternalResponseDto> {
    return this.usecase.createPullRequestReviewForInternal(
      projectId,
      pullNumber,
      dto,
    );
  }
}
