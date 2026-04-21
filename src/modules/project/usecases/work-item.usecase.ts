import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  CreateWorkItemDto,
  UpdateWorkItemDto,
  WorkItemResponseDto,
} from '@/modules/project/dto';
import {
  isWorkItemParentForeignKeyViolation,
  ProjectNotFoundError,
  WorkItemAssigneeNotFoundError,
  WorkItemNotFoundError,
  WorkItemParentInvalidError,
  WorkItemParentNotFoundError,
} from '@/modules/project/errors';
import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATUSES,
} from '@/modules/project/types';
import {
  ProjectRepository,
  WorkItemRepository,
} from '@/modules/project/repository';

@Injectable()
export class WorkItemUseCase {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly workItemRepository: WorkItemRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async createWorkItem(
    userId: string,
    projectId: string,
    dto: CreateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    return this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      if (dto.parentId) {
        const parent = await this.workItemRepository.findWorkItemById(
          project.projectId,
          dto.parentId,
          manager,
        );
        if (!parent) {
          throw new WorkItemParentNotFoundError();
        }
      }

      const assignees =
        await this.workItemRepository.findProjectMembersByUsernames(
          project.projectId,
          dto.assigneeUsernames ?? [],
          manager,
        );
      if (assignees.length !== (dto.assigneeUsernames?.length ?? 0)) {
        throw new WorkItemAssigneeNotFoundError();
      }

      try {
        const workItem = await this.workItemRepository.createWorkItem(
          {
            projectId: project.projectId,
            parentId: dto.parentId,
            title: dto.title,
            description: dto.description,
            type: dto.type,
            priority: dto.priority ?? WORK_ITEM_PRIORITIES[1],
            status: WORK_ITEM_STATUSES[0],
          },
          manager,
        );

        const labels = await this.workItemRepository.ensureWorkItemLabels(
          project.projectId,
          dto.labelNames ?? [],
          manager,
        );

        await this.workItemRepository.createWorkItemAssignees(
          project.projectId,
          workItem.itemId,
          assignees.map((assignee) => assignee.memberId),
          manager,
        );
        await this.workItemRepository.createWorkItemLabels(
          project.projectId,
          workItem.itemId,
          labels.map((label) => label.labelId),
          manager,
        );

        return {
          ...workItem,
          assigneeUsernames: assignees.map((assignee) => assignee.username),
          labelNames: labels.map((label) => label.label),
        };
      } catch (error) {
        if (isWorkItemParentForeignKeyViolation(error)) {
          throw new WorkItemParentNotFoundError();
        }

        throw error;
      }
    });
  }

  async updateWorkItem(
    userId: string,
    projectId: string,
    itemId: string,
    dto: UpdateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    return this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      const currentWorkItem =
        await this.workItemRepository.findWorkItemRecordById(
          project.projectId,
          itemId,
          manager,
        );
      if (!currentWorkItem) {
        throw new WorkItemNotFoundError();
      }

      if (dto.parentId !== undefined) {
        if (dto.parentId === itemId) {
          throw new WorkItemParentInvalidError();
        }

        if (dto.parentId) {
          const parent = await this.workItemRepository.findWorkItemById(
            project.projectId,
            dto.parentId,
            manager,
          );
          if (!parent) {
            throw new WorkItemParentNotFoundError();
          }
        }
      }

      if (dto.assigneeUsernames !== undefined) {
        const assignees =
          await this.workItemRepository.findProjectMembersByUsernames(
            project.projectId,
            dto.assigneeUsernames,
            manager,
          );
        if (assignees.length !== dto.assigneeUsernames.length) {
          throw new WorkItemAssigneeNotFoundError();
        }

        await this.workItemRepository.replaceWorkItemAssignees(
          project.projectId,
          itemId,
          assignees.map((assignee) => assignee.memberId),
          manager,
        );
      }

      if (dto.labelNames !== undefined) {
        const labels = await this.workItemRepository.ensureWorkItemLabels(
          project.projectId,
          dto.labelNames,
          manager,
        );

        await this.workItemRepository.replaceWorkItemLabels(
          project.projectId,
          itemId,
          labels.map((label) => label.labelId),
          manager,
        );
      }

      try {
        await this.workItemRepository.updateWorkItem(
          {
            projectId: project.projectId,
            itemId,
            hasParentId: dto.parentId !== undefined,
            parentId:
              dto.parentId !== undefined ? (dto.parentId ?? null) : null,
            hasTitle: dto.title !== undefined,
            title: dto.title ?? null,
            hasDescription: dto.description !== undefined,
            description: dto.description ?? null,
            hasType: dto.type !== undefined,
            type: dto.type ?? null,
            hasPriority: dto.priority !== undefined,
            priority: dto.priority ?? null,
            hasStatus: dto.status !== undefined,
            status: dto.status ?? null,
          },
          manager,
        );
      } catch (error) {
        if (isWorkItemParentForeignKeyViolation(error)) {
          throw new WorkItemParentNotFoundError();
        }

        throw error;
      }

      const updatedWorkItem =
        await this.workItemRepository.findWorkItemDetailById(
          project.projectId,
          itemId,
          manager,
        );
      if (!updatedWorkItem) {
        throw new WorkItemNotFoundError();
      }

      return updatedWorkItem;
    });
  }
}
