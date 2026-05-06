import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  CommentResponseDto,
  CreateCommentDto,
  SearchCommentsQueryDto,
  SearchCommentsResponseDto,
} from '@/modules/project/dto';
import {
  ProjectNotFoundError,
  WorkItemNotFoundError,
} from '@/modules/project/errors';
import {
  CommentRepository,
  ProjectRepository,
  WorkItemRepository,
} from '@/modules/project/repository';

@Injectable()
export class CommentUseCase {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly workItemRepository: WorkItemRepository,
    private readonly commentRepository: CommentRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async createWorkItemComment(
    userId: string,
    projectId: string,
    itemId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
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

      const workItem = await this.workItemRepository.findWorkItemById(
        project.projectId,
        itemId,
        manager,
      );
      if (!workItem) {
        throw new WorkItemNotFoundError();
      }

      return this.commentRepository.createWorkItemComment(
        {
          projectId: project.projectId,
          itemId,
          authorUserId: userId,
          body: dto.body,
        },
        manager,
      );
    });
  }

  async searchWorkItemComments(
    userId: string,
    projectId: string,
    itemId: string,
    query: SearchCommentsQueryDto,
  ): Promise<SearchCommentsResponseDto> {
    const project = await this.projectRepository.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }

    const workItem = await this.workItemRepository.findWorkItemById(
      project.projectId,
      itemId,
    );
    if (!workItem) {
      throw new WorkItemNotFoundError();
    }

    return this.commentRepository.searchWorkItemComments({
      projectId: project.projectId,
      itemId,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }
}
