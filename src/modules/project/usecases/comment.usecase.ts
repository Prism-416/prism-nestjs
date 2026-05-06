import { Injectable } from '@nestjs/common';
import {
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
  ) {}

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
