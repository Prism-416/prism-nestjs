import { Injectable } from '@nestjs/common';
import {
  ClaimEmbeddingJobsDto,
  ClaimEmbeddingJobsResponseDto,
  CreateEmbeddingJobDto,
  EmbeddingJobResponseDto,
  UpdateEmbeddingJobDto,
} from '@/modules/embedding/dto';
import {
  EmbeddingJobNotFoundError,
  EmbeddingJobRequeueScheduledAtRequiredError,
  EmbeddingJobTargetNotFoundError,
  EmbeddingProjectNotFoundError,
} from '@/modules/embedding/errors';
import { EmbeddingJobRepository } from '@/modules/embedding/repository';
import { EMBEDDING_JOB_DIMENSIONS } from '@/modules/embedding/types';

@Injectable()
export class EmbeddingJobUseCase {
  constructor(private readonly repo: EmbeddingJobRepository) {}

  async createEmbeddingJob(
    userId: string,
    projectId: string,
    dto: CreateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new EmbeddingProjectNotFoundError();
    }

    const targetExists = await this.repo.existsEmbeddingTarget(
      project.projectId,
      dto.jobType,
      dto.targetId,
    );
    if (!targetExists) {
      throw new EmbeddingJobTargetNotFoundError();
    }

    return this.repo.createEmbeddingJob({
      projectId: project.projectId,
      jobType: dto.jobType,
      targetId: dto.targetId,
      model: dto.model,
      dimensions: dto.dimensions ?? EMBEDDING_JOB_DIMENSIONS,
      contentHash: dto.contentHash,
      objectName: dto.objectName,
      maxAttempts: dto.maxAttempts ?? 3,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
    });
  }

  async claimEmbeddingJobs(
    userId: string,
    projectId: string,
    dto: ClaimEmbeddingJobsDto,
  ): Promise<ClaimEmbeddingJobsResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new EmbeddingProjectNotFoundError();
    }

    return this.claimProjectEmbeddingJobs(project.projectId, dto);
  }

  async claimEmbeddingJobsForInternal(
    projectId: string,
    dto: ClaimEmbeddingJobsDto,
  ): Promise<ClaimEmbeddingJobsResponseDto> {
    const project = await this.repo.findProjectById(projectId);
    if (!project) {
      throw new EmbeddingProjectNotFoundError();
    }

    return this.claimProjectEmbeddingJobs(project.projectId, dto);
  }

  async updateEmbeddingJob(
    userId: string,
    projectId: string,
    embeddingJobId: string,
    dto: UpdateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new EmbeddingProjectNotFoundError();
    }

    return this.updateProjectEmbeddingJob(
      project.projectId,
      embeddingJobId,
      dto,
    );
  }

  async updateEmbeddingJobForInternal(
    projectId: string,
    embeddingJobId: string,
    dto: UpdateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    const project = await this.repo.findProjectById(projectId);
    if (!project) {
      throw new EmbeddingProjectNotFoundError();
    }

    return this.updateProjectEmbeddingJob(
      project.projectId,
      embeddingJobId,
      dto,
    );
  }

  private async claimProjectEmbeddingJobs(
    projectId: string,
    dto: ClaimEmbeddingJobsDto,
  ): Promise<ClaimEmbeddingJobsResponseDto> {
    const items = await this.repo.claimEmbeddingJobs({
      projectId,
      jobTypes: dto.jobTypes,
      model: dto.model,
      limit: dto.limit ?? 10,
    });

    return {
      items,
      count: items.length,
    };
  }

  private async updateProjectEmbeddingJob(
    projectId: string,
    embeddingJobId: string,
    dto: UpdateEmbeddingJobDto,
  ): Promise<EmbeddingJobResponseDto> {
    if (dto.status === 'queued' && dto.scheduledAt === undefined) {
      throw new EmbeddingJobRequeueScheduledAtRequiredError();
    }

    const job = await this.repo.updateEmbeddingJob({
      projectId,
      embeddingJobId,
      status: dto.status,
      errorMessage: dto.errorMessage,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
    if (!job) {
      throw new EmbeddingJobNotFoundError();
    }

    return job;
  }
}
