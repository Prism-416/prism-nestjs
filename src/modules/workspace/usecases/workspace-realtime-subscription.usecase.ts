import { Injectable } from '@nestjs/common';
import { WorkspaceNotFoundError } from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';

@Injectable()
export class WorkspaceRealtimeSubscriptionUseCase {
  constructor(private readonly repo: WorkspaceRepository) {}

  async joinWorkspace(userId: string, workspaceId: string): Promise<void> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }
  }
}
