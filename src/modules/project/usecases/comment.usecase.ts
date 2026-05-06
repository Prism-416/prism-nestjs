import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  CommentResponseDto,
  CreateCommentDto,
  SearchCommentsQueryDto,
  SearchCommentsResponseDto,
} from '@/modules/project/dto';
import {
  CommentNotFoundError,
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

  async updateWorkItemComment(
    userId: string,
    projectId: string,
    itemId: string,
    commentId: string,
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

      const comment = await this.commentRepository.updateWorkItemComment(
        {
          projectId: project.projectId,
          itemId,
          commentId,
          authorUserId: userId,
          body: dto.body,
        },
        manager,
      );
      if (!comment) {
        throw new CommentNotFoundError();
      }

      return comment;
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
