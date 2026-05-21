import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  ClaimEmbeddingJobsDto,
  ClaimEmbeddingJobsResponseDto,
  CreateEmbeddingJobDto,
  EmbeddingJobResponseDto,
  UpdateEmbeddingJobDto,
} from '@/modules/embedding/dto';
import { EmbeddingJobUseCase } from '@/modules/embedding/usecases';
import { RequireInternalScopes } from '@/modules/admin';

@ApiTags('Project Embedding Job')
@Controller(':projectId/embedding-jobs')
export class EmbeddingJobController {
  constructor(private readonly usecase: EmbeddingJobUseCase) {}

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create embedding job' })
  @ApiDataResponse(EmbeddingJobResponseDto, { status: HttpStatus.CREATED })
  async createEmbeddingJob(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    return this.usecase.createEmbeddingJob(String(user.sub), projectId, dto);
  }

  @Post('claim')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim queued embedding jobs' })
  @ApiDataResponse(ClaimEmbeddingJobsResponseDto)
  async claimEmbeddingJobs(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: ClaimEmbeddingJobsDto,
  ): Promise<ClaimEmbeddingJobsResponseDto> {
    return this.usecase.claimEmbeddingJobs(String(user.sub), projectId, dto);
  }

  @Post('internal/claim')
  @RequireInternalScopes('embeddings:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim queued embedding jobs for internal workers' })
  @ApiDataResponse(ClaimEmbeddingJobsResponseDto)
  async claimEmbeddingJobsForInternal(
    @Param('projectId') projectId: string,
    @Body() dto: ClaimEmbeddingJobsDto,
  ): Promise<ClaimEmbeddingJobsResponseDto> {
    return this.usecase.claimEmbeddingJobsForInternal(projectId, dto);
  }

  @Patch(':embeddingJobId')
  @Authenticated()
  @ApiOperation({ summary: 'Update embedding job status' })
  @ApiDataResponse(EmbeddingJobResponseDto)
  async updateEmbeddingJob(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('embeddingJobId') embeddingJobId: string,
    @Body() dto: UpdateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    return this.usecase.updateEmbeddingJob(
      String(user.sub),
      projectId,
      embeddingJobId,
      dto,
    );
  }

  @Patch('internal/:embeddingJobId')
  @RequireInternalScopes('embeddings:write')
  @ApiOperation({ summary: 'Update embedding job status for internal workers' })
  @ApiDataResponse(EmbeddingJobResponseDto)
  async updateEmbeddingJobForInternal(
    @Param('projectId') projectId: string,
    @Param('embeddingJobId') embeddingJobId: string,
    @Body() dto: UpdateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    return this.usecase.updateEmbeddingJobForInternal(
      projectId,
      embeddingJobId,
      dto,
    );
  }
}
