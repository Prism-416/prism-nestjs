import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  CreateSprintDto,
  SprintResponseDto,
  UpdateSprintMetadataDto,
} from '@/modules/sprint/dto';
import {
  SearchWorkItemsQueryDto,
  SearchWorkItemsResponseDto,
} from '@/modules/project/dto';
import {
  isSprintNameUniqueViolation,
  isSprintPeriodCheckViolation,
  SprintAlreadyExistsError,
  SprintNotFoundError,
  SprintPeriodInvalidError,
  SprintProjectNotFoundError,
} from '@/modules/sprint/errors';
import { SprintRepository } from '@/modules/sprint/repository';
import { SPRINT_STATUSES } from '@/modules/sprint/types';

@Injectable()
export class SprintUseCase {
  constructor(
    private readonly repo: SprintRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async getSprints(
    userId: string,
    projectId: string,
  ): Promise<SprintResponseDto[]> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new SprintProjectNotFoundError();
    }

    return this.repo.findSprintsByProjectId(project.projectId);
  }

  async getSprintWorkItems(
    userId: string,
    projectId: string,
    sprintId: string,
    query: SearchWorkItemsQueryDto,
  ): Promise<SearchWorkItemsResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new SprintProjectNotFoundError();
    }

    const sprint = await this.repo.findSprintById(project.projectId, sprintId);
    if (!sprint) {
      throw new SprintNotFoundError();
    }

    return this.repo.searchSprintWorkItems({
      projectId: project.projectId,
      sprintId: sprint.sprintId,
      query: query.query,
      parentId: query.parentId,
      type: query.type,
      priority: query.priority,
      status: query.status,
      assigneeUsername: query.assigneeUsername,
      labelName: query.labelName,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  async getSprintMetadata(
    userId: string,
    projectId: string,
    sprintId: string,
  ): Promise<SprintResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new SprintProjectNotFoundError();
    }

    const sprint = await this.repo.findSprintById(project.projectId, sprintId);
    if (!sprint) {
      throw new SprintNotFoundError();
    }

    return sprint;
  }

  async createSprint(
    userId: string,
    projectId: string,
    dto: CreateSprintDto,
  ): Promise<SprintResponseDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new SprintPeriodInvalidError();
    }

    return this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndMemberUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new SprintProjectNotFoundError();
      }

      try {
        return await this.repo.createSprint(
          {
            projectId: project.projectId,
            name: dto.name,
            description: dto.description,
            startsAt,
            endsAt,
            status: dto.status ?? SPRINT_STATUSES[0],
          },
          manager,
        );
      } catch (error) {
        if (isSprintNameUniqueViolation(error)) {
          throw new SprintAlreadyExistsError();
        }

        if (isSprintPeriodCheckViolation(error)) {
          throw new SprintPeriodInvalidError();
        }

        throw error;
      }
    });
  }

  async updateSprintMetadata(
    userId: string,
    projectId: string,
    sprintId: string,
    dto: UpdateSprintMetadataDto,
  ): Promise<SprintResponseDto> {
    return this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndMemberUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new SprintProjectNotFoundError();
      }

      const currentSprint = await this.repo.findSprintById(
        project.projectId,
        sprintId,
        manager,
      );
      if (!currentSprint) {
        throw new SprintNotFoundError();
      }

      const startsAt =
        dto.startsAt !== undefined
          ? new Date(dto.startsAt)
          : currentSprint.startsAt;
      const endsAt =
        dto.endsAt !== undefined ? new Date(dto.endsAt) : currentSprint.endsAt;

      if (startsAt >= endsAt) {
        throw new SprintPeriodInvalidError();
      }

      let updatedSprint: SprintResponseDto | null;

      try {
        updatedSprint = await this.repo.updateSprintMetadata(
          {
            projectId: project.projectId,
            sprintId,
            name: dto.name ?? currentSprint.name,
            description: dto.description ?? currentSprint.description,
            startsAt,
            endsAt,
            status: dto.status ?? currentSprint.status,
          },
          manager,
        );
      } catch (error) {
        if (isSprintNameUniqueViolation(error)) {
          throw new SprintAlreadyExistsError();
        }

        if (isSprintPeriodCheckViolation(error)) {
          throw new SprintPeriodInvalidError();
        }

        throw error;
      }

      if (!updatedSprint) {
        throw new SprintNotFoundError();
      }

      return updatedSprint;
    });
  }

  async deleteSprint(
    userId: string,
    projectId: string,
    sprintId: string,
  ): Promise<void> {
    return this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndMemberUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new SprintProjectNotFoundError();
      }

      const deleted = await this.repo.deleteSprint(
        project.projectId,
        sprintId,
        manager,
      );
      if (!deleted) {
        throw new SprintNotFoundError();
      }
    });
  }
}
