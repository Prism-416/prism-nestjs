import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  AddSprintWorkItemsDto,
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
  isSprintWorkItemMapDuplicateViolation,
  SprintAlreadyExistsError,
  SprintNotFoundError,
  SprintPeriodInvalidError,
  SprintWorkItemAlreadyAddedError,
  SprintWorkItemNotFoundError,
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
      const workspace = await this.repo.findWorkspaceByIdAndAdminMemberUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new SprintWorkspaceNotFoundError();
      }

      const nextNumber = await this.repo.getNextSprintNumber(
        workspace.workspaceId,
        manager,
      );

      let sprint: SprintResponseDto;

      try {
        sprint = await this.repo.createSprint(
          {
            workspaceId: workspace.workspaceId,
            name: `Sprint #${nextNumber}`,
            goal: dto.goal,
            startsAt,
            endsAt,
            status: SPRINT_STATUSES[0],
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

      const itemsInRange = await this.repo.findWorkItemsInSprintRange(
        workspace.workspaceId,
        startsAt,
        endsAt,
        manager,
      );

      if (itemsInRange.length > 0) {
        await this.repo.addSprintWorkItems(
          {
            workspaceId: workspace.workspaceId,
            sprintId: sprint.sprintId,
            items: itemsInRange,
            addedBy: userId,
          },
          manager,
        );
      }

      return sprint;
    });
  }

  async updateSprintMetadata(
    userId: string,
    workspaceId: string,
    sprintId: string,
    dto: UpdateSprintMetadataDto,
  ): Promise<SprintResponseDto> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndAdminMemberUserId(
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

  async addSprintWorkItems(
    userId: string,
    workspaceId: string,
    sprintId: string,
    dto: AddSprintWorkItemsDto,
  ): Promise<void> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndAdminMemberUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new SprintWorkspaceNotFoundError();
      }

      const sprint = await this.repo.findSprintById(
        workspace.workspaceId,
        sprintId,
        manager,
      );
      if (!sprint) {
        throw new SprintNotFoundError();
      }

      const foundItems = await this.repo.findWorkItemsByIds(
        workspace.workspaceId,
        dto.itemIds,
        manager,
      );
      if (foundItems.length !== dto.itemIds.length) {
        throw new SprintWorkItemNotFoundError();
      }

      try {
        await this.repo.addSprintWorkItems(
          {
            workspaceId: workspace.workspaceId,
            sprintId: sprint.sprintId,
            items: foundItems,
            addedBy: userId,
          },
          manager,
        );
      } catch (error) {
        if (isSprintWorkItemMapDuplicateViolation(error)) {
          throw new SprintWorkItemAlreadyAddedError();
        }
        throw error;
      }
    });
  }

  async removeSprintWorkItem(
    userId: string,
    workspaceId: string,
    sprintId: string,
    itemId: string,
  ): Promise<void> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndAdminMemberUserId(
        workspaceId,
        userId,
        manager,
      );
      if (!workspace) {
        throw new SprintWorkspaceNotFoundError();
      }

      const sprint = await this.repo.findSprintById(
        workspace.workspaceId,
        sprintId,
        manager,
      );
      if (!sprint) {
        throw new SprintNotFoundError();
      }

      const removed = await this.repo.removeSprintWorkItem(
        workspace.workspaceId,
        sprint.sprintId,
        itemId,
        manager,
      );
      if (!removed) {
        throw new SprintWorkItemNotFoundError();
      }
    });
  }

  async deleteSprint(
    userId: string,
    workspaceId: string,
    sprintId: string,
  ): Promise<void> {
    return this.uow.run(async (manager) => {
      const workspace = await this.repo.findWorkspaceByIdAndAdminMemberUserId(
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
