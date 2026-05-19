import { Injectable } from '@nestjs/common';
import {
  AgentRunResponseDto,
  SearchAgentRunsQueryDto,
  SearchAgentRunsResponseDto,
} from '@/modules/agent/dto';
import {
  AgentProjectNotFoundError,
  AgentRunNotFoundError,
} from '@/modules/agent/errors';
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

  async getAgentRun(
    userId: string,
    projectId: string,
    runId: string,
  ): Promise<AgentRunResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new AgentProjectNotFoundError();
    }

    const run = await this.repo.findAgentRunById(project.projectId, runId);
    if (!run) {
      throw new AgentRunNotFoundError();
    }

    return run;
  }
}
