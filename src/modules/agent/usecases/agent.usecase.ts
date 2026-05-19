import { Injectable } from '@nestjs/common';
import {
  SearchAgentRunsQueryDto,
  SearchAgentRunsResponseDto,
} from '@/modules/agent/dto';
import { AgentProjectNotFoundError } from '@/modules/agent/errors';
import { AgentRepository } from '@/modules/agent/repository';

@Injectable()
export class AgentUseCase {
  constructor(private readonly repo: AgentRepository) {}

  async searchAgentRuns(
    userId: string,
    projectId: string,
    query: SearchAgentRunsQueryDto,
  ): Promise<SearchAgentRunsResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new AgentProjectNotFoundError();
    }

    return this.repo.searchAgentRuns({
      projectId: project.projectId,
      status: query.status,
      agentType: query.agentType,
      workItemId: query.workItemId,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }
}
