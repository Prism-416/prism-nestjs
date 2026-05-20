import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  AgentMemoryEmbeddingResponseDto,
  AgentMemoryResponseDto,
  AgentActionEventResponseDto,
  AgentActionResponseDto,
  AgentRunResponseDto,
  AgentStepResponseDto,
  CreateAgentRunDto,
  SearchAgentRunsQueryDto,
  SearchAgentRunsResponseDto,
  UpsertAgentMemoryDto,
  UpsertAgentMemoryEmbeddingDto,
} from '@/modules/agent/dto';
import {
  AgentActionNotFoundError,
  AgentActionNotApprovableError,
  AgentActionNotCancellableError,
  AgentMemoryEmbeddingTargetMismatchError,
  AgentMemoryNotFoundError,
  AgentMemoryTargetMismatchError,
  AgentParentRunNotFoundError,
  AgentProjectNotFoundError,
  AgentRunNotCancellableError,
  AgentRunNotFoundError,
  AgentWorkItemNotFoundError,
} from '@/modules/agent/errors';
import { AgentRepository } from '@/modules/agent/repository';
import {
  AGENT_EMBEDDING_DIMENSIONS,
  AgentRunStatus,
} from '@/modules/agent/types';

const AGENT_RUN_CANCELLABLE_STATUSES: AgentRunStatus[] = [
  'queued',
  'running',
  'waiting',
];
const AGENT_ACTION_APPROVABLE_STATUSES = ['proposed'];
const AGENT_ACTION_CANCELLABLE_STATUSES = ['proposed', 'approved'];

@Injectable()
export class AgentUseCase {
  constructor(
    private readonly repo: AgentRepository,
    private readonly uow: UnitOfWork,
  ) {}

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

  async createAgentRun(
    userId: string,
    projectId: string,
    dto: CreateAgentRunDto,
  ): Promise<AgentRunResponseDto> {
    return this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndMemberUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new AgentProjectNotFoundError();
      }

      if (dto.workItemId !== undefined) {
        const workItem = await this.repo.findWorkItemById(
          project.projectId,
          dto.workItemId,
          manager,
        );
        if (!workItem) {
          throw new AgentWorkItemNotFoundError();
        }
      }

      if (dto.parentRunId !== undefined) {
        const parentRun = await this.repo.findAgentRunById(
          project.projectId,
          dto.parentRunId,
          manager,
        );
        if (!parentRun) {
          throw new AgentParentRunNotFoundError();
        }
      }

      return this.repo.createAgentRun(
        {
          projectId: project.projectId,
          triggeredByUserId: userId,
          workItemId: dto.workItemId,
          parentRunId: dto.parentRunId,
          agentType: dto.agentType,
          objective: dto.objective,
          systemPromptVersion: dto.systemPromptVersion,
        },
        manager,
      );
    });
  }

  async cancelAgentRun(
    userId: string,
    projectId: string,
    runId: string,
  ): Promise<AgentRunResponseDto> {
    return this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndMemberUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new AgentProjectNotFoundError();
      }

      const run = await this.repo.findAgentRunById(
        project.projectId,
        runId,
        manager,
      );
      if (!run) {
        throw new AgentRunNotFoundError();
      }

      if (!AGENT_RUN_CANCELLABLE_STATUSES.includes(run.status)) {
        throw new AgentRunNotCancellableError();
      }

      const cancelledRun = await this.repo.cancelAgentRun(
        {
          projectId: project.projectId,
          runId,
          cancellableStatuses: AGENT_RUN_CANCELLABLE_STATUSES,
        },
        manager,
      );
      if (!cancelledRun) {
        throw new AgentRunNotCancellableError();
      }

      return cancelledRun;
    });
  }

  async getAgentRunSteps(
    userId: string,
    projectId: string,
    runId: string,
  ): Promise<AgentStepResponseDto[]> {
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

    return this.repo.findAgentStepsByRunId(project.projectId, run.runId);
  }

  async getAgentRunActions(
    userId: string,
    projectId: string,
    runId: string,
  ): Promise<AgentActionResponseDto[]> {
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

    return this.repo.findAgentActionsByRunId(project.projectId, run.runId);
  }

  async getAgentAction(
    userId: string,
    projectId: string,
    actionId: string,
  ): Promise<AgentActionResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new AgentProjectNotFoundError();
    }

    const action = await this.repo.findAgentActionById(
      project.projectId,
      actionId,
    );
    if (!action) {
      throw new AgentActionNotFoundError();
    }

    return action;
  }

  async approveAgentAction(
    userId: string,
    projectId: string,
    actionId: string,
  ): Promise<AgentActionResponseDto> {
    return this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndMemberUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new AgentProjectNotFoundError();
      }

      const action = await this.repo.findAgentActionById(
        project.projectId,
        actionId,
        manager,
      );
      if (!action) {
        throw new AgentActionNotFoundError();
      }

      if (
        !action.requiresApproval ||
        !AGENT_ACTION_APPROVABLE_STATUSES.includes(action.status)
      ) {
        throw new AgentActionNotApprovableError();
      }

      const approvedAction = await this.repo.approveAgentAction(
        {
          projectId: project.projectId,
          actionId,
          approvedByUserId: userId,
          approvableStatuses: AGENT_ACTION_APPROVABLE_STATUSES,
        },
        manager,
      );
      if (!approvedAction) {
        throw new AgentActionNotApprovableError();
      }

      await this.repo.createAgentActionEvent(
        {
          actionId: approvedAction.actionId,
          actorUserId: userId,
          eventType: 'approved',
        },
        manager,
      );

      return approvedAction;
    });
  }

  async cancelAgentAction(
    userId: string,
    projectId: string,
    actionId: string,
  ): Promise<AgentActionResponseDto> {
    return this.uow.run(async (manager) => {
      const project = await this.repo.findProjectByIdAndMemberUserId(
        projectId,
        userId,
        manager,
      );
      if (!project) {
        throw new AgentProjectNotFoundError();
      }

      const action = await this.repo.findAgentActionById(
        project.projectId,
        actionId,
        manager,
      );
      if (!action) {
        throw new AgentActionNotFoundError();
      }

      if (
        action.executedAt !== null ||
        !AGENT_ACTION_CANCELLABLE_STATUSES.includes(action.status)
      ) {
        throw new AgentActionNotCancellableError();
      }

      const cancelledAction = await this.repo.cancelAgentAction(
        {
          projectId: project.projectId,
          actionId,
          cancellableStatuses: AGENT_ACTION_CANCELLABLE_STATUSES,
        },
        manager,
      );
      if (!cancelledAction) {
        throw new AgentActionNotCancellableError();
      }

      await this.repo.createAgentActionEvent(
        {
          actionId: cancelledAction.actionId,
          actorUserId: userId,
          eventType: 'cancelled',
        },
        manager,
      );

      return cancelledAction;
    });
  }

  async getAgentActionEvents(
    userId: string,
    projectId: string,
    actionId: string,
  ): Promise<AgentActionEventResponseDto[]> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new AgentProjectNotFoundError();
    }

    const action = await this.repo.findAgentActionById(
      project.projectId,
      actionId,
    );
    if (!action) {
      throw new AgentActionNotFoundError();
    }

    return this.repo.findAgentActionEventsByActionId(action.actionId);
  }

  async upsertAgentMemory(
    userId: string,
    projectId: string,
    dto: UpsertAgentMemoryDto,
  ): Promise<AgentMemoryResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new AgentProjectNotFoundError();
    }

    const memory = await this.repo.upsertAgentMemory({
      projectId: project.projectId,
      memoryId: dto.memoryId,
      runId: dto.runId,
      stepId: dto.stepId,
      memoryType: dto.memoryType,
      title: dto.title,
      content: dto.content,
      contentHash: dto.contentHash,
    });
    if (!memory) {
      throw new AgentMemoryTargetMismatchError();
    }

    return memory;
  }

  async upsertAgentMemoryEmbedding(
    userId: string,
    projectId: string,
    memoryId: string,
    dto: UpsertAgentMemoryEmbeddingDto,
  ): Promise<AgentMemoryEmbeddingResponseDto> {
    const project = await this.repo.findProjectByIdAndMemberUserId(
      projectId,
      userId,
    );
    if (!project) {
      throw new AgentProjectNotFoundError();
    }

    const memory = await this.repo.findAgentMemoryById(
      project.projectId,
      memoryId,
    );
    if (!memory) {
      throw new AgentMemoryNotFoundError();
    }

    const embedding = await this.repo.upsertAgentMemoryEmbedding({
      projectId: project.projectId,
      memoryId,
      contentHash: dto.contentHash,
      model: dto.model,
      dimensions: dto.dimensions ?? AGENT_EMBEDDING_DIMENSIONS,
      embedding: dto.embedding,
    });
    if (!embedding) {
      throw new AgentMemoryEmbeddingTargetMismatchError();
    }

    return embedding;
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
