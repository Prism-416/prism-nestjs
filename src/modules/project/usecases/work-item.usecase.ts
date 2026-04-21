import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import { CreateWorkItemDto, WorkItemResponseDto } from '@/modules/project/dto';
import {
  isWorkItemParentForeignKeyViolation,
  ProjectNotFoundError,
  WorkItemAssigneeNotFoundError,
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
}
