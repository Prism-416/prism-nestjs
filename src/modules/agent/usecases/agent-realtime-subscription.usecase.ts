import { Injectable } from '@nestjs/common';
import { AgentWorkspaceNotFoundError } from '@/modules/agent/errors';
import { AgentRepository } from '@/modules/agent/repository';

@Injectable()
export class AgentRealtimeSubscriptionUseCase {
  constructor(private readonly repo: AgentRepository) {}

  async joinWorkspace(userId: string, workspaceId: string): Promise<void> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
    );
    if (!workspace) {
      throw new AgentWorkspaceNotFoundError();
    }
  }
}
