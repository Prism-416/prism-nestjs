import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/core/database';
import { ObjectStorageDeletionService } from '@/core/object-storage';
import { DocumentRepository } from '@/modules/document/repository';
import {
  PROJECT_EMBEDDING_DIMENSIONS,
  WORK_ITEM_TRASH_RETENTION_DAYS,
} from '@/modules/project/constants';
import {
  CreateWorkItemDto,
  ReorderWorkItemsDto,
  SearchTrashedWorkItemsResponseDto,
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
  WorkItemScheduleInvalidError,
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
    private readonly documentRepository: DocumentRepository,
    private readonly objectStorageDeletionService: ObjectStorageDeletionService,
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

  async getWorkItemForInternal(
    projectId: string,
    itemId: string,
  ): Promise<WorkItemResponseDto> {
    const project = await this.projectRepository.findProjectById(projectId);
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
      topLevel: query.topLevel,
      priority: query.priority,
      status: query.status,
      assigneeUsername: query.assigneeUsername,
      labelName: query.labelName,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  async searchWorkItemsForInternal(
    projectId: string,
    query: SearchWorkItemsQueryDto,
  ): Promise<SearchWorkItemsResponseDto> {
    const project = await this.projectRepository.findProjectById(projectId);
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return this.workItemRepository.searchWorkItems({
      workspaceId: project.workspaceId,
      projectId: project.projectId,
      query: query.query,
      parentId: query.parentId,
      topLevel: query.topLevel,
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

  async getWorkItemChildrenForInternal(
    projectId: string,
    itemId: string,
  ): Promise<WorkItemResponseDto[]> {
    const project = await this.projectRepository.findProjectById(projectId);
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
    this.validateSchedule(dto.startDate ?? null, dto.dueDate ?? null);

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
            startDate: dto.startDate ?? null,
            dueDate: dto.dueDate ?? null,
            priority: dto.priority ?? WORK_ITEM_PRIORITIES[1],
            status: dto.status ?? WORK_ITEM_STATUSES[0],
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

      const nextStartDate =
        dto.startDate !== undefined ? dto.startDate : currentWorkItem.startDate;
      const nextDueDate =
        dto.dueDate !== undefined ? dto.dueDate : currentWorkItem.dueDate;
      this.validateSchedule(nextStartDate, nextDueDate);

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
            hasStartDate: dto.startDate !== undefined,
            startDate: dto.startDate ?? null,
            hasDueDate: dto.dueDate !== undefined,
            dueDate: dto.dueDate ?? null,
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

  private validateSchedule(
    startDate: string | null,
    dueDate: string | null,
  ): void {
    if (startDate && dueDate && startDate > dueDate) {
      throw new WorkItemScheduleInvalidError();
    }
  }

  async reorderWorkItems(
    userId: string,
    projectId: string,
    dto: ReorderWorkItemsDto,
  ): Promise<WorkItemResponseDto[]> {
    const reorderedWorkItems = await this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      const itemIds = dto.items.map((item) => item.itemId);
      const topLevelItemIds =
        await this.workItemRepository.findTopLevelWorkItemIds(
          project.workspaceId,
          project.projectId,
          itemIds,
          manager,
        );
      if (topLevelItemIds.length !== itemIds.length) {
        throw new WorkItemNotFoundError();
      }

      await this.workItemRepository.reorderTopLevelWorkItems(
        project.workspaceId,
        project.projectId,
        dto.items,
        manager,
      );

      const workItems = await this.workItemRepository.findWorkItemDetailsByIds(
        project.workspaceId,
        project.projectId,
        itemIds,
        manager,
      );
      if (workItems.length !== itemIds.length) {
        throw new WorkItemNotFoundError();
      }

      return workItems;
    });

    this.realtimePublisher.publishWorkItemsReordered({
      projectId,
      workItems: reorderedWorkItems,
    });

    return reorderedWorkItems;
  }

  /**
   * Move a single work item (and its descendants) to the trash (soft delete).
   */
  async deleteWorkItem(
    userId: string,
    projectId: string,
    itemId: string,
  ): Promise<void> {
    const rootIds = await this.trashWorkItems(userId, projectId, [itemId]);
    if (rootIds.length === 0) {
      throw new WorkItemNotFoundError();
    }

    for (const rootId of rootIds) {
      this.realtimePublisher.publishWorkItemDeleted({
        projectId,
        itemId: rootId,
      });
    }
  }

  /**
   * Move multiple work items (and their descendants) to the trash at once.
   */
  async bulkDeleteWorkItems(
    userId: string,
    projectId: string,
    itemIds: string[],
  ): Promise<void> {
    const rootIds = await this.trashWorkItems(userId, projectId, itemIds);
    if (rootIds.length === 0) {
      throw new WorkItemNotFoundError();
    }

    for (const rootId of rootIds) {
      this.realtimePublisher.publishWorkItemDeleted({
        projectId,
        itemId: rootId,
      });
    }
  }

  private async trashWorkItems(
    userId: string,
    projectId: string,
    itemIds: string[],
  ): Promise<string[]> {
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

      // Only the requested ids that are still live become deletion roots; the
      // repository cascades to descendants and returns every affected id.
      const liveRootIds: string[] = [];
      for (const itemId of itemIds) {
        const existing = await this.workItemRepository.findWorkItemById(
          project.workspaceId,
          project.projectId,
          itemId,
          manager,
        );
        if (existing) {
          liveRootIds.push(existing.itemId);
        }
      }

      if (liveRootIds.length === 0) {
        return [];
      }

      await this.workItemRepository.softDeleteWorkItemsWithDescendants(
        project.workspaceId,
        project.projectId,
        liveRootIds,
        manager,
      );

      return liveRootIds;
    });
  }

  /**
   * List trashed work items, purging any whose retention window has elapsed.
   */
  async searchTrashedWorkItems(
    userId: string,
    projectId: string,
  ): Promise<SearchTrashedWorkItemsResponseDto> {
    const project = await this.projectRepository.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const expiredRootIds =
      await this.workItemRepository.findExpiredTrashedWorkItemRootIds(
        project.workspaceId,
        project.projectId,
        WORK_ITEM_TRASH_RETENTION_DAYS,
      );
    await this.permanentlyDeleteTrashedWorkItemRoots(
      project.workspaceId,
      project.projectId,
      expiredRootIds,
    );

    const items = await this.workItemRepository.searchTrashedWorkItems(
      project.workspaceId,
      project.projectId,
    );

    return { items };
  }

  /**
   * Restore a trashed work item (and its trashed descendants) back to the board.
   */
  async restoreWorkItem(
    userId: string,
    projectId: string,
    itemId: string,
  ): Promise<WorkItemResponseDto> {
    const restored = await this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      const root = await this.workItemRepository.findTrashedWorkItemRootById(
        project.workspaceId,
        project.projectId,
        itemId,
        manager,
      );
      if (!root) {
        throw new WorkItemNotFoundError();
      }

      await this.workItemRepository.restoreWorkItemWithDescendants(
        project.workspaceId,
        project.projectId,
        itemId,
        manager,
      );

      const detail = await this.workItemRepository.findWorkItemDetailById(
        project.workspaceId,
        project.projectId,
        itemId,
        manager,
      );
      if (!detail) {
        throw new WorkItemNotFoundError();
      }

      return detail;
    });

    this.realtimePublisher.publishWorkItemCreated(restored);

    return restored;
  }

  /**
   * Permanently delete a trashed work item (and its descendants via cascade).
   */
  async permanentlyDeleteWorkItem(
    userId: string,
    projectId: string,
    itemId: string,
  ): Promise<void> {
    const deletedIds =
      await this.permanentlyDeleteAuthorizedTrashedWorkItemRoots(
        userId,
        projectId,
        [itemId],
      );
    if (deletedIds.length === 0) {
      throw new WorkItemNotFoundError();
    }

    this.realtimePublisher.publishWorkItemDeleted({ projectId, itemId });
  }

  /**
   * Restore multiple trashed work items (and their descendants) at once.
   */
  async bulkRestoreWorkItems(
    userId: string,
    projectId: string,
    itemIds: string[],
  ): Promise<WorkItemResponseDto[]> {
    const restored = await this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      const details: WorkItemResponseDto[] = [];
      for (const itemId of itemIds) {
        const root = await this.workItemRepository.findTrashedWorkItemRootById(
          project.workspaceId,
          project.projectId,
          itemId,
          manager,
        );
        if (!root) {
          continue;
        }

        await this.workItemRepository.restoreWorkItemWithDescendants(
          project.workspaceId,
          project.projectId,
          itemId,
          manager,
        );

        const detail = await this.workItemRepository.findWorkItemDetailById(
          project.workspaceId,
          project.projectId,
          itemId,
          manager,
        );
        if (detail) {
          details.push(detail);
        }
      }

      return details;
    });

    for (const detail of restored) {
      this.realtimePublisher.publishWorkItemCreated(detail);
    }

    return restored;
  }

  /**
   * Permanently delete multiple trashed work items (and descendants) at once.
   */
  async bulkPermanentlyDeleteWorkItems(
    userId: string,
    projectId: string,
    itemIds: string[],
  ): Promise<void> {
    const deletedIds =
      await this.permanentlyDeleteAuthorizedTrashedWorkItemRoots(
        userId,
        projectId,
        itemIds,
      );

    for (const itemId of deletedIds) {
      this.realtimePublisher.publishWorkItemDeleted({ projectId, itemId });
    }
  }

  private async permanentlyDeleteTrashedWorkItemRoots(
    workspaceId: string,
    projectId: string,
    itemIds: string[],
  ): Promise<string[]> {
    if (itemIds.length === 0) {
      return [];
    }

    const result = await this.uow.run((manager) =>
      this.deleteTrashedWorkItemRoots(workspaceId, projectId, itemIds, manager),
    );

    await this.processObjectDeletions(result.deletionIds);

    return result.removed;
  }

  private async permanentlyDeleteAuthorizedTrashedWorkItemRoots(
    userId: string,
    projectId: string,
    itemIds: string[],
  ): Promise<string[]> {
    const result = await this.uow.run(async (manager) => {
      const project =
        await this.projectRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new ProjectNotFoundError();
      }

      return this.deleteTrashedWorkItemRoots(
        project.workspaceId,
        project.projectId,
        itemIds,
        manager,
      );
    });

    await this.processObjectDeletions(result.deletionIds);

    return result.removed;
  }

  private async deleteTrashedWorkItemRoots(
    workspaceId: string,
    projectId: string,
    itemIds: string[],
    manager: EntityManager,
  ): Promise<{ removed: string[]; deletionIds: string[] }> {
    const removed: string[] = [];
    const deletionIds: string[] = [];

    for (const itemId of new Set(itemIds)) {
      const root = await this.workItemRepository.findTrashedWorkItemRootById(
        workspaceId,
        projectId,
        itemId,
        manager,
      );
      if (!root) {
        continue;
      }

      const subtreeIds =
        await this.workItemRepository.findTrashedWorkItemSubtreeIds(
          workspaceId,
          projectId,
          itemId,
          manager,
        );
      const documents =
        await this.documentRepository.deleteDocumentsBySourceWorkItemIds(
          workspaceId,
          projectId,
          subtreeIds,
          manager,
        );

      for (const document of documents) {
        const deletionId = await this.objectStorageDeletionService.enqueue(
          {
            objectName: document.storageObjectName,
            storageVersionId: document.storageVersionId ?? undefined,
            reason: 'work_item_permanently_deleted',
          },
          manager,
        );
        if (deletionId) {
          deletionIds.push(deletionId);
        }
      }

      await this.workItemRepository.deleteWorkItem(
        workspaceId,
        projectId,
        itemId,
        manager,
      );
      removed.push(itemId);
    }

    return { removed, deletionIds };
  }

  private async processObjectDeletions(deletionIds: string[]): Promise<void> {
    for (const deletionId of deletionIds) {
      await this.objectStorageDeletionService.processDeletion(deletionId);
    }
  }
}
