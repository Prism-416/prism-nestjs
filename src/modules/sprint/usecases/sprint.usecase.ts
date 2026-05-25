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
  SprintWorkspaceNotFoundError,
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
    workspaceId: string,
  ): Promise<SprintResponseDto[]> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new SprintWorkspaceNotFoundError();
    }

    return this.repo.findSprintsByWorkspaceId(workspace.workspaceId);
  }

  async getSprintWorkItems(
    userId: string,
    workspaceId: string,
    sprintId: string,
    query: SearchWorkItemsQueryDto,
  ): Promise<SearchWorkItemsResponseDto> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new SprintWorkspaceNotFoundError();
    }

    const sprint = await this.repo.findSprintById(
      workspace.workspaceId,
      sprintId,
    );
    if (!sprint) {
      throw new SprintNotFoundError();
    }

    return this.repo.searchSprintWorkItems({
      workspaceId: workspace.workspaceId,
      sprintId: sprint.sprintId,
      query: query.query,
      parentId: query.parentId,
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
    workspaceId: string,
    sprintId: string,
  ): Promise<SprintResponseDto> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new SprintWorkspaceNotFoundError();
    }

    const sprint = await this.repo.findSprintById(
      workspace.workspaceId,
      sprintId,
    );
    if (!sprint) {
      throw new SprintNotFoundError();
    }

    return sprint;
  }

  async createSprint(
    userId: string,
    workspaceId: string,
    dto: CreateSprintDto,
  ): Promise<SprintResponseDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new SprintPeriodInvalidError();
    }

    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new SprintWorkspaceNotFoundError();
      }

      try {
        return await this.repo.createSprint(
          {
            workspaceId: workspace.workspaceId,
            name: dto.name,
            goal: dto.goal,
            startsAt,
            endsAt,
            status: dto.status ?? SPRINT_STATUSES[0],
            createdBy: userId,
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
    workspaceId: string,
    sprintId: string,
    dto: UpdateSprintMetadataDto,
  ): Promise<SprintResponseDto> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new SprintWorkspaceNotFoundError();
      }

      const currentSprint = await this.repo.findSprintById(
        workspace.workspaceId,
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
            workspaceId: workspace.workspaceId,
            sprintId,
            name: dto.name ?? currentSprint.name,
            goal: dto.goal ?? currentSprint.goal,
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
    workspaceId: string,
    sprintId: string,
  ): Promise<void> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new SprintWorkspaceNotFoundError();
      }

      const deleted = await this.repo.deleteSprint(
        workspace.workspaceId,
        sprintId,
        manager,
      );
      if (!deleted) {
        throw new SprintNotFoundError();
      }
    });
  }
}
