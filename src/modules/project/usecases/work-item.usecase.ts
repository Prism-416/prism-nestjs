import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import { PROJECT_EMBEDDING_DIMENSIONS } from '@/modules/project/constants';
import {
  CreateWorkItemDto,
  SearchWorkItemsQueryDto,
  SearchWorkItemsResponseDto,
  UpdateWorkItemDto,
  UpsertWorkItemEmbeddingDto,
  WorkItemEmbeddingResponseDto,
  WorkItemResponseDto,
} from '@/modules/project/dto';
import {
  isWorkItemParentForeignKeyViolation,
  ProjectNotFoundError,
  WorkItemAssigneeNotFoundError,
  WorkItemEmbeddingTargetMismatchError,
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
import { ProjectRealtimePublisherService } from '@/modules/project/services';

@Injectable()
export class WorkItemUseCase {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly workItemRepository: WorkItemRepository,
    private readonly uow: UnitOfWork,
    private readonly realtimePublisher: ProjectRealtimePublisherService,
  ) {}

  async getWorkItem(
    userId: string,
    projectId: string,
    itemId: string,
  ): Promise<WorkItemResponseDto> {
    const project = await this.projectRepository.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const workItem = await this.workItemRepository.findWorkItemDetailById(
      project.workspaceId,
      project.projectId,
      itemId,
    );
    if (!workItem) {
      throw new WorkItemNotFoundError();
    }

    return workItem;
  }

  async searchWorkItems(
    userId: string,
    projectId: string,
    query: SearchWorkItemsQueryDto,
  ): Promise<SearchWorkItemsResponseDto> {
    const project = await this.projectRepository.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return this.workItemRepository.searchWorkItems({
      workspaceId: project.workspaceId,
      projectId: project.projectId,
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

  async getWorkItemChildren(
    userId: string,
    projectId: string,
    itemId: string,
  ): Promise<WorkItemResponseDto[]> {
    const project = await this.projectRepository.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const workItem = await this.workItemRepository.findWorkItemById(
      project.workspaceId,
      project.projectId,
      itemId,
    );
    if (!workItem) {
      throw new WorkItemNotFoundError();
    }

    return this.workItemRepository.findChildWorkItems(
      project.workspaceId,
      project.projectId,
      itemId,
    );
  }

  async upsertWorkItemEmbedding(
    userId: string,
    projectId: string,
    itemId: string,
    dto: UpsertWorkItemEmbeddingDto,
  ): Promise<WorkItemEmbeddingResponseDto> {
    const project = await this.projectRepository.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return this.upsertProjectWorkItemEmbedding(
      project.workspaceId,
      project.projectId,
      itemId,
      dto,
    );
  }

  async upsertWorkItemEmbeddingForInternal(
    projectId: string,
    itemId: string,
    dto: UpsertWorkItemEmbeddingDto,
  ): Promise<WorkItemEmbeddingResponseDto> {
    const project = await this.projectRepository.findProjectById(projectId);
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return this.upsertProjectWorkItemEmbedding(
      project.workspaceId,
      project.projectId,
      itemId,
      dto,
    );
  }

  private async upsertProjectWorkItemEmbedding(
    workspaceId: string,
    projectId: string,
    itemId: string,
    dto: UpsertWorkItemEmbeddingDto,
  ): Promise<WorkItemEmbeddingResponseDto> {
    const workItem = await this.workItemRepository.findWorkItemById(
      workspaceId,
      projectId,
      itemId,
    );
    if (!workItem) {
      throw new WorkItemNotFoundError();
    }

    const embedding = await this.workItemRepository.upsertWorkItemEmbedding({
      workspaceId,
      projectId,
      itemId,
      embeddedTitle: dto.embeddedTitle,
      embeddedDescription: dto.embeddedDescription,
      contentHash: dto.contentHash,
      model: dto.model,
      dimensions: dto.dimensions ?? PROJECT_EMBEDDING_DIMENSIONS,
      embedding: dto.embedding,
    });
    if (!embedding) {
      throw new WorkItemEmbeddingTargetMismatchError();
    }

    return embedding;
  }

  async createWorkItem(
    userId: string,
    projectId: string,
    dto: CreateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    const createdWorkItem = await this.uow.run(async (manager) => {
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
          project.workspaceId,
          project.projectId,
          dto.parentId,
          manager,
        );
        if (!parent) {
          throw new WorkItemParentNotFoundError();
        }
      }

      const assignees =
        await this.workItemRepository.findWorkspaceMembersByUsernames(
          project.workspaceId,
          dto.assigneeUsernames ?? [],
          manager,
        );
      if (assignees.length !== (dto.assigneeUsernames?.length ?? 0)) {
        throw new WorkItemAssigneeNotFoundError();
      }

      try {
        const workItem = await this.workItemRepository.createWorkItem(
          {
            workspaceId: project.workspaceId,
            projectId: project.projectId,
            parentId: dto.parentId,
            title: dto.title,
            description: dto.description,
            priority: dto.priority ?? WORK_ITEM_PRIORITIES[1],
            status: WORK_ITEM_STATUSES[0],
            createdBy: userId,
          },
          manager,
        );

        const labels = await this.workItemRepository.ensureWorkItemLabels(
          project.projectId,
          dto.labelNames ?? [],
          manager,
        );

        await this.workItemRepository.createWorkItemAssignees(
          project.workspaceId,
          workItem.itemId,
          assignees.map((assignee) => assignee.userId),
          userId,
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

    this.realtimePublisher.publishWorkItemCreated(createdWorkItem);

    return createdWorkItem;
  }

  async updateWorkItem(
    userId: string,
    projectId: string,
    itemId: string,
    dto: UpdateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    const updatedWorkItem = await this.uow.run(async (manager) => {
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
          project.workspaceId,
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
            project.workspaceId,
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
          await this.workItemRepository.findWorkspaceMembersByUsernames(
            project.workspaceId,
            dto.assigneeUsernames,
            manager,
          );
        if (assignees.length !== dto.assigneeUsernames.length) {
          throw new WorkItemAssigneeNotFoundError();
        }

        await this.workItemRepository.replaceWorkItemAssignees(
          project.workspaceId,
          itemId,
          assignees.map((assignee) => assignee.userId),
          userId,
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
            workspaceId: project.workspaceId,
            projectId: project.projectId,
            itemId,
            hasParentId: dto.parentId !== undefined,
            parentId:
              dto.parentId !== undefined ? (dto.parentId ?? null) : null,
            hasTitle: dto.title !== undefined,
            title: dto.title ?? null,
            hasDescription: dto.description !== undefined,
            description: dto.description ?? null,
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
          project.workspaceId,
          project.projectId,
          itemId,
          manager,
        );
      if (!updatedWorkItem) {
        throw new WorkItemNotFoundError();
      }

      return updatedWorkItem;
    });

    this.realtimePublisher.publishWorkItemUpdated(updatedWorkItem);

    return updatedWorkItem;
  }

  async deleteWorkItem(
    userId: string,
    projectId: string,
    itemId: string,
  ): Promise<void> {
    await this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      const deleted = await this.workItemRepository.deleteWorkItem(
        project.workspaceId,
        project.projectId,
        itemId,
        manager,
      );
      if (!deleted) {
        throw new WorkItemNotFoundError();
      }
    });

    this.realtimePublisher.publishWorkItemDeleted({ projectId, itemId });
  }
}
