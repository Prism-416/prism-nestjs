import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { OciQueueService } from '@/core/queue';

const AGENT_WORKFLOW_QUEUE_CHANNEL = 'agent-workflows';
const AGENT_WORKFLOW_STDOUT_QUEUE_MESSAGE_ID_PREFIX = 'stdout';

export type AgentWorkflowDispatchParams = {
  kind: 'manual' | 'scheduled';
  eventType: string;
  workspaceId: string;
  projectId: string;
  actorUserId?: string;
};

export type AgentWorkflowDispatchResult = {
  runId: string;
  eventType: string;
  queueMessageId: string;
};

/**
 * Publishes prism-agent runtime event envelopes for PM workflows that are not
 * driven by domain mutations (backlog refinement, sprint planning, scheduled
 * scans). The message body must validate against the agent runtime's
 * EventEnvelope schema: a `manual` event routes as `manual.<eventType>` and a
 * `scheduled` event as `scheduled.<eventType>`.
 */
@Injectable()
export class AgentWorkflowDispatchService {
  constructor(
    private readonly queue: OciQueueService,
    private readonly configService: ConfigService,
  ) {}

  async dispatch(
    params: AgentWorkflowDispatchParams,
  ): Promise<AgentWorkflowDispatchResult> {
    const runId = randomUUID();
    const payload: Record<string, unknown> = { agentRunId: runId };
    if (params.actorUserId) {
      payload.requestedByUserId = params.actorUserId;
    }

    const event: Record<string, unknown> = {
      kind: params.kind,
      event_type: params.eventType,
      workspace_id: params.workspaceId,
      project_id: params.projectId,
      payload,
      correlation_id: runId,
      idempotency_key: `${params.kind}:${params.eventType}:${runId}`,
    };
    if (params.kind === 'manual' && params.actorUserId) {
      event.actor_id = params.actorUserId;
    }
    const envelope = { event };

    if (this.isStdoutDispatchMode()) {
      this.writeStdoutPayload('agent-workflow.event', envelope);

      return {
        runId,
        eventType: params.eventType,
        queueMessageId: `${AGENT_WORKFLOW_STDOUT_QUEUE_MESSAGE_ID_PREFIX}:${runId}`,
      };
    }

    const result = await this.queue.publishMessages({
      queueKind: 'agentEvents',
      messages: [
        {
          content: JSON.stringify(envelope),
          metadata: {
            channelId: AGENT_WORKFLOW_QUEUE_CHANNEL,
            customProperties: {
              eventType: params.eventType,
              eventKind: params.kind,
              runId,
              workspaceId: params.workspaceId,
              projectId: params.projectId,
            },
          },
        },
      ],
    });

    const message = result.messages[0];
    if (!message) {
      throw new InternalServerErrorException(
        'Failed to publish queue message.',
      );
    }

    return {
      runId,
      eventType: params.eventType,
      queueMessageId: String(message.id),
    };
  }

  private isStdoutDispatchMode(): boolean {
    return (
      (this.configService.get<string>('AGENT_WORKFLOW_DISPATCH_MODE') ?? 'oci')
        .trim()
        .toLowerCase() === 'stdout'
    );
  }

  private writeStdoutPayload(label: string, payload: unknown): void {
    process.stdout.write(`${label} ${JSON.stringify(payload, null, 2)}\n`);
  }
}
