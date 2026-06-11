import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { UnitOfWork } from '@/core/database';
import {
  AgentWorkflowDispatchResponseDto,
  AgentActionEventResponseDto,
  AgentActionResponseDto,
  CreateAgentActionEventForInternalDto,
  AgentMemoryEmbeddingResponseDto,
  AgentMemoryResponseDto,
  AgentRunResponseDto,
  AgentRunStateResponseDto,
  AgentStepResponseDto,
  CreateAgentRunForInternalDto,
  CreateAgentRunDto,
  SearchAgentRunsQueryDto,
  SearchAgentRunsResponseDto,
  UpdateAgentRunStatusForInternalDto,
  UpsertAgentActionForInternalDto,
  UpsertAgentMemoryDto,
  UpsertAgentMemoryEmbeddingDto,
  UpsertAgentStepForInternalDto,
} from '@/modules/agent/dto';
import {
  AgentActionNotApprovableError,
  AgentActionNotCancellableError,
  AgentActionNotFoundError,
  AgentActionTargetMismatchError,
  AgentMemoryEmbeddingTargetMismatchError,
  AgentMemoryNotFoundError,
  AgentMemoryTargetMismatchError,
  AgentParentRunNotFoundError,
  AgentRunNotCancellableError,
  AgentRunNotFoundError,
  AgentRunTargetMismatchError,
  AgentStepTargetMismatchError,
  AgentWorkspaceNotFoundError,
  AgentWorkItemNotFoundError,
  AgentWorkflowTriggerNotSupportedError,
} from '@/modules/agent/errors';
import { AgentRepository } from '@/modules/agent/repository';
import {
  AgentRealtimePublisherService,
  AgentWorkflowDispatchService,
} from '@/modules/agent/services';
import {
  AGENT_EMBEDDING_DIMENSIONS,
  AgentRunStatus,
  AgentWorkspaceRow,
} from '@/modules/agent/types';

const AGENT_RUN_CANCELLABLE_STATUSES: AgentRunStatus[] = [
  'queued',
  'running',
  'waiting',
];
const AGENT_ACTION_APPROVABLE_STATUSES = ['proposed'];
const AGENT_ACTION_CANCELLABLE_STATUSES = ['proposed', 'approved'];

const MANUAL_WORKFLOW_TRIGGERS: Record<string, string> = {
  'refine-backlog': 'refine_backlog',
  'plan-sprint': 'plan_sprint',
};

const SCHEDULED_WORKFLOW_TRIGGERS: Record<string, string> = {
  'stale-work-scan': 'stale_work_scan',
  'sprint-planning': 'sprint_planning',
};

@Injectable()
export class AgentUseCase {
  constructor(
    private readonly repo: AgentRepository,
    private readonly uow: UnitOfWork,
    private readonly realtimePublisher: AgentRealtimePublisherService,
    private readonly workflowDispatch: AgentWorkflowDispatchService,
  ) {}

  async searchAgentRuns(
    userId: string,
    workspaceId: string,
    query: SearchAgentRunsQueryDto,
  ): Promise<SearchAgentRunsResponseDto> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    // Lazy sweep: a run abandoned mid-flight (crashed or timed-out worker
    // invocation, exhausted redelivery) has nothing left to finalize it, so
    // close out runs stuck past the threshold whenever the list is read.
    const expiredRuns = await this.repo.expireStaleAgentRuns(
      workspace.workspaceId,
    );
    for (const expiredRun of expiredRuns) {
      this.realtimePublisher.publishAgentRunUpdated(expiredRun);
    }

    return this.repo.searchAgentRuns({
      workspaceId: workspace.workspaceId,
      status: query.status,
      agentType: query.agentType,
      workItemId: query.workItemId,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  async dispatchWorkflowForMember(
    userId: string,
    workspaceId: string,
    projectId: string,
    trigger: string,
  ): Promise<AgentWorkflowDispatchResponseDto> {
    const eventType = MANUAL_WORKFLOW_TRIGGERS[trigger];
    if (!eventType) {
      throw new AgentWorkflowTriggerNotSupportedError();
    }
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    return this.workflowDispatch.dispatch({
      kind: 'manual',
      eventType,
      workspaceId: workspace.workspaceId,
      projectId,
      actorUserId: userId,
    });
  }

  async dispatchWorkflowForInternal(
    workspaceId: string,
    projectId: string,
    trigger: string,
  ): Promise<AgentWorkflowDispatchResponseDto> {
    const eventType = SCHEDULED_WORKFLOW_TRIGGERS[trigger];
    if (!eventType) {
      throw new AgentWorkflowTriggerNotSupportedError();
    }

    return this.workflowDispatch.dispatch({
      kind: 'scheduled',
      eventType,
      workspaceId,
      projectId,
    });
  }

  async createAgentRun(
    userId: string,
    workspaceId: string,
    dto: CreateAgentRunDto,
  ): Promise<AgentRunResponseDto> {
    const run = await this.uow.run(async (manager) => {
      const workspace = await this.getWorkspaceForUser(
        userId,
        workspaceId,
        manager,
      );

      if (dto.workItemId !== undefined) {
        const workItem = await this.repo.findWorkItemById(
          workspace.workspaceId,
          dto.workItemId,
          manager,
        );
        if (!workItem) {
          throw new AgentWorkItemNotFoundError();
        }
      }

      if (dto.parentRunId !== undefined) {
        const parentRun = await this.repo.findAgentRunById(
          workspace.workspaceId,
          dto.parentRunId,
          manager,
        );
        if (!parentRun) {
          throw new AgentParentRunNotFoundError();
        }
      }

      return this.repo.createAgentRun(
        {
          workspaceId: workspace.workspaceId,
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

    this.realtimePublisher.publishAgentRunCreated(run);

    return run;
  }

  async createAgentRunForInternal(
    workspaceId: string,
    dto: CreateAgentRunForInternalDto,
  ): Promise<AgentRunResponseDto> {
    const result = await this.uow.run(async (manager) => {
      const workspace = await this.getWorkspace(workspaceId, manager);

      if (dto.workItemId !== undefined) {
        const workItem = await this.repo.findWorkItemById(
          workspace.workspaceId,
          dto.workItemId,
          manager,
        );
        if (!workItem) {
          throw new AgentWorkItemNotFoundError();
        }
      }

      if (dto.parentRunId !== undefined) {
        const parentRun = await this.repo.findAgentRunById(
          workspace.workspaceId,
          dto.parentRunId,
          manager,
        );
        if (!parentRun) {
          throw new AgentParentRunNotFoundError();
        }
      }

      return this.repo.createAgentRunForInternal(
        {
          workspaceId: workspace.workspaceId,
          runId: dto.runId,
          triggeredByUserId: dto.triggeredByUserId,
          workItemId: dto.workItemId,
          parentRunId: dto.parentRunId,
          agentType: dto.agentType,
          triggerType: dto.triggerType,
          status: dto.status ?? 'queued',
          objective: dto.objective,
          systemPromptVersion: dto.systemPromptVersion,
          createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
        },
        manager,
      );
    });

    if (!result) {
      throw new AgentRunTargetMismatchError();
    }

    if (result.wasCreated) {
      this.realtimePublisher.publishAgentRunCreated(result.run);
    }

    return result.run;
  }

  async cancelAgentRun(
    userId: string,
    workspaceId: string,
    runId: string,
  ): Promise<AgentRunResponseDto> {
    const result = await this.uow.run(async (manager) => {
      const workspace = await this.getWorkspaceForUser(
        userId,
        workspaceId,
        manager,
      );

      const run = await this.repo.findAgentRunById(
        workspace.workspaceId,
        runId,
        manager,
      );
      if (!run) {
        throw new AgentRunNotFoundError();
      }

      // Idempotent: a run already cancelled has reached the requested terminal
      // state, so a repeated cancel (e.g. a double-clicked stop) is a no-op
      // that returns the run as-is instead of erroring.
      if (run.status === 'cancelled') {
        return { run, didCancel: false };
      }

      if (!AGENT_RUN_CANCELLABLE_STATUSES.includes(run.status)) {
        throw new AgentRunNotCancellableError();
      }

      const cancelledRun = await this.repo.cancelAgentRun(
        {
          workspaceId: workspace.workspaceId,
          runId,
          cancellableStatuses: AGENT_RUN_CANCELLABLE_STATUSES,
        },
        manager,
      );
      if (cancelledRun) {
        return { run: cancelledRun, didCancel: true };
      }

      // The conditional update matched nothing: the run left the cancellable
      // set between our read and write (a concurrent cancel, or a worker
      // finalizing it). Re-read to tell an idempotent no-op apart from a
      // genuine conflict.
      const current = await this.repo.findAgentRunById(
        workspace.workspaceId,
        runId,
        manager,
      );
      if (current?.status === 'cancelled') {
        return { run: current, didCancel: false };
      }

      throw new AgentRunNotCancellableError();
    });

    if (result.didCancel) {
      this.realtimePublisher.publishAgentRunUpdated(result.run);
    }

    return result.run;
  }

  async updateAgentRunStatusForInternal(
    workspaceId: string,
    runId: string,
    dto: UpdateAgentRunStatusForInternalDto,
  ): Promise<AgentRunResponseDto> {
    await this.getWorkspace(workspaceId);

    const run = await this.repo.updateAgentRunStatus({
      workspaceId,
      runId,
      status: dto.status,
    });
    if (!run) {
      throw new AgentRunNotFoundError();
    }

    this.realtimePublisher.publishAgentRunUpdated(run);

    return run;
  }

  async getAgentRunStateForInternal(
    workspaceId: string,
    runId: string,
  ): Promise<AgentRunStateResponseDto> {
    const workspace = await this.getWorkspace(workspaceId);

    const run = await this.repo.findAgentRunById(workspace.workspaceId, runId);
    if (!run) {
      throw new AgentRunNotFoundError();
    }

    const [steps, actions, actionEvents, memories] = await Promise.all([
      this.repo.findAgentStepsByRunId(workspace.workspaceId, run.runId),
      this.repo.findAgentActionsByRunId(workspace.workspaceId, run.runId),
      this.repo.findAgentActionEventsByRunId(workspace.workspaceId, run.runId),
      this.repo.findAgentMemoriesByRunId(workspace.workspaceId, run.runId),
    ]);

    return {
      run,
      steps,
      actions,
      actionEvents,
      memories,
    };
  }

  async upsertAgentStepForInternal(
    workspaceId: string,
    runId: string,
    dto: UpsertAgentStepForInternalDto,
  ): Promise<AgentStepResponseDto> {
    await this.getWorkspace(workspaceId);

    const result = await this.repo.upsertAgentStep({
      workspaceId,
      runId,
      stepId: dto.stepId,
      stepOrder: dto.stepOrder,
      stepType: dto.stepType,
      status: dto.status,
      title: dto.title,
      inputObjectName: dto.inputObjectName,
      outputObjectName: dto.outputObjectName,
      inputSummary: dto.inputSummary,
      outputSummary: dto.outputSummary,
      errorMessage: dto.errorMessage,
    });
    if (!result) {
      throw new AgentStepTargetMismatchError();
    }

    const payload = { ...result.step, workspaceId };
    if (result.wasCreated) {
      this.realtimePublisher.publishAgentStepCreated(payload);
    } else {
      this.realtimePublisher.publishAgentStepUpdated(payload);
    }

    return result.step;
  }

  async getAgentRunSteps(
    userId: string,
    workspaceId: string,
    runId: string,
  ): Promise<AgentStepResponseDto[]> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    const run = await this.repo.findAgentRunById(workspace.workspaceId, runId);
    if (!run) {
      throw new AgentRunNotFoundError();
    }

    return this.repo.findAgentStepsByRunId(workspace.workspaceId, run.runId);
  }

  async getAgentRunActions(
    userId: string,
    workspaceId: string,
    runId: string,
  ): Promise<AgentActionResponseDto[]> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    const run = await this.repo.findAgentRunById(workspace.workspaceId, runId);
    if (!run) {
      throw new AgentRunNotFoundError();
    }

    return this.repo.findAgentActionsByRunId(workspace.workspaceId, run.runId);
  }

  async upsertAgentActionForInternal(
    workspaceId: string,
    runId: string,
    dto: UpsertAgentActionForInternalDto,
  ): Promise<AgentActionResponseDto> {
    await this.getWorkspace(workspaceId);

    const result = await this.repo.upsertAgentAction({
      workspaceId,
      runId,
      actionId: dto.actionId,
      stepId: dto.stepId,
      actionType: dto.actionType,
      targetType: dto.targetType,
      targetId: dto.targetId,
      status: dto.status,
      reasoningSummary: dto.reasoningSummary,
      payloadObjectName: dto.payloadObjectName,
      resultObjectName: dto.resultObjectName,
      requiresApproval: dto.requiresApproval ?? true,
      approvedByUserId: dto.approvedByUserId,
      executedAt: dto.executedAt ? new Date(dto.executedAt) : undefined,
      errorMessage: dto.errorMessage,
    });
    if (!result) {
      throw new AgentActionTargetMismatchError();
    }

    if (result.wasCreated) {
      this.realtimePublisher.publishAgentActionCreated(result.action);
    } else {
      this.realtimePublisher.publishAgentActionUpdated(result.action);
    }

    return result.action;
  }

  async getAgentAction(
    userId: string,
    workspaceId: string,
    actionId: string,
  ): Promise<AgentActionResponseDto> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    const action = await this.repo.findAgentActionById(
      workspace.workspaceId,
      actionId,
    );
    if (!action) {
      throw new AgentActionNotFoundError();
    }

    return action;
  }

  async approveAgentAction(
    userId: string,
    workspaceId: string,
    actionId: string,
  ): Promise<AgentActionResponseDto> {
    const result = await this.uow.run(async (manager) => {
      const workspace = await this.getWorkspaceForUser(
        userId,
        workspaceId,
        manager,
      );

      const action = await this.repo.findAgentActionById(
        workspace.workspaceId,
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
          workspaceId: workspace.workspaceId,
          actionId,
          approvedByUserId: userId,
          approvableStatuses: AGENT_ACTION_APPROVABLE_STATUSES,
        },
        manager,
      );
      if (!approvedAction) {
        throw new AgentActionNotApprovableError();
      }

      const event = await this.repo.createAgentActionEvent(
        {
          actionId: approvedAction.actionId,
          actorUserId: userId,
          eventType: 'approved',
        },
        manager,
      );

      return { approvedAction, event, workspaceId: workspace.workspaceId };
    });

    this.realtimePublisher.publishAgentActionUpdated(result.approvedAction);
    this.realtimePublisher.publishAgentActionEventCreated({
      ...result.event,
      workspaceId: result.workspaceId,
    });

    return result.approvedAction;
  }

  async cancelAgentAction(
    userId: string,
    workspaceId: string,
    actionId: string,
  ): Promise<AgentActionResponseDto> {
    const result = await this.uow.run(async (manager) => {
      const workspace = await this.getWorkspaceForUser(
        userId,
        workspaceId,
        manager,
      );

      const action = await this.repo.findAgentActionById(
        workspace.workspaceId,
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
          workspaceId: workspace.workspaceId,
          actionId,
          cancellableStatuses: AGENT_ACTION_CANCELLABLE_STATUSES,
        },
        manager,
      );
      if (!cancelledAction) {
        throw new AgentActionNotCancellableError();
      }

      const event = await this.repo.createAgentActionEvent(
        {
          actionId: cancelledAction.actionId,
          actorUserId: userId,
          eventType: 'cancelled',
        },
        manager,
      );

      return { cancelledAction, event, workspaceId: workspace.workspaceId };
    });

    this.realtimePublisher.publishAgentActionUpdated(result.cancelledAction);
    this.realtimePublisher.publishAgentActionEventCreated({
      ...result.event,
      workspaceId: result.workspaceId,
    });

    return result.cancelledAction;
  }

  async getAgentActionEvents(
    userId: string,
    workspaceId: string,
    actionId: string,
  ): Promise<AgentActionEventResponseDto[]> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    const action = await this.repo.findAgentActionById(
      workspace.workspaceId,
      actionId,
    );
    if (!action) {
      throw new AgentActionNotFoundError();
    }

    return this.repo.findAgentActionEventsByActionId(action.actionId);
  }

  async createAgentActionEventForInternal(
    workspaceId: string,
    actionId: string,
    dto: CreateAgentActionEventForInternalDto,
  ): Promise<AgentActionEventResponseDto> {
    await this.getWorkspace(workspaceId);

    const action = await this.repo.findAgentActionById(workspaceId, actionId);
    if (!action) {
      throw new AgentActionNotFoundError();
    }

    const event = await this.repo.createAgentActionEvent({
      actionId,
      actorUserId: dto.actorUserId,
      eventType: dto.eventType,
      message: dto.message,
      eventObjectName: dto.eventObjectName,
    });

    this.realtimePublisher.publishAgentActionEventCreated({
      ...event,
      workspaceId,
    });

    return event;
  }

  async upsertAgentMemory(
    userId: string,
    workspaceId: string,
    dto: UpsertAgentMemoryDto,
  ): Promise<AgentMemoryResponseDto> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    return this.upsertWorkspaceAgentMemory(workspace.workspaceId, dto);
  }

  async upsertAgentMemoryForInternal(
    workspaceId: string,
    dto: UpsertAgentMemoryDto,
  ): Promise<AgentMemoryResponseDto> {
    const workspace = await this.getWorkspace(workspaceId);

    return this.upsertWorkspaceAgentMemory(workspace.workspaceId, dto);
  }

  private async upsertWorkspaceAgentMemory(
    workspaceId: string,
    dto: UpsertAgentMemoryDto,
  ): Promise<AgentMemoryResponseDto> {
    const memory = await this.repo.upsertAgentMemory({
      workspaceId,
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
    workspaceId: string,
    memoryId: string,
    dto: UpsertAgentMemoryEmbeddingDto,
  ): Promise<AgentMemoryEmbeddingResponseDto> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    return this.upsertWorkspaceAgentMemoryEmbedding(
      workspace.workspaceId,
      memoryId,
      dto,
    );
  }

  async upsertAgentMemoryEmbeddingForInternal(
    workspaceId: string,
    memoryId: string,
    dto: UpsertAgentMemoryEmbeddingDto,
  ): Promise<AgentMemoryEmbeddingResponseDto> {
    const workspace = await this.getWorkspace(workspaceId);

    return this.upsertWorkspaceAgentMemoryEmbedding(
      workspace.workspaceId,
      memoryId,
      dto,
    );
  }

  private async upsertWorkspaceAgentMemoryEmbedding(
    workspaceId: string,
    memoryId: string,
    dto: UpsertAgentMemoryEmbeddingDto,
  ): Promise<AgentMemoryEmbeddingResponseDto> {
    const memory = await this.repo.findAgentMemoryById(workspaceId, memoryId);
    if (!memory) {
      throw new AgentMemoryNotFoundError();
    }

    const embedding = await this.repo.upsertAgentMemoryEmbedding({
      workspaceId,
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
    workspaceId: string,
    runId: string,
  ): Promise<AgentRunResponseDto> {
    const workspace = await this.getWorkspaceForUser(userId, workspaceId);

    const run = await this.repo.findAgentRunById(workspace.workspaceId, runId);
    if (!run) {
      throw new AgentRunNotFoundError();
    }

    return run;
  }

  private async getWorkspaceForUser(
    userId: string,
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<AgentWorkspaceRow> {
    const workspace = await this.repo.findWorkspaceByIdAndMemberUserId(
      workspaceId,
      userId,
      manager,
    );
    if (!workspace) {
      throw new AgentWorkspaceNotFoundError();
    }

    return workspace;
  }

  private async getWorkspace(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<AgentWorkspaceRow> {
    const workspace = await this.repo.findWorkspaceById(workspaceId, manager);
    if (!workspace) {
      throw new AgentWorkspaceNotFoundError();
    }

    return workspace;
  }
}
