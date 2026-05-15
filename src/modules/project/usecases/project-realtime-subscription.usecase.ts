import { Injectable } from '@nestjs/common';
import { ProjectNotFoundError } from '@/modules/project/errors';
import { ProjectRepository } from '@/modules/project/repository';

@Injectable()
export class ProjectRealtimeSubscriptionUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async joinProject(userId: string, projectId: string): Promise<void> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new ProjectNotFoundError();
    }
  }
}
