import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OciQueueService } from '@/core/queue';
import type { AgentRunRequestedEvent } from '@/modules/agent/types';

const AGENT_RUN_QUEUE_CHANNEL = 'agent-runs';
const PR_REVIEW_REQUESTED_EVENT_KIND = 'domain';
const PR_REVIEW_REQUESTED_EVENT_TYPE = 'pr.review_requested';
const AGENT_RUN_STDOUT_QUEUE_MESSAGE_ID_PREFIX = 'stdout';

@Injectable()
export class AgentDispatchService {
  constructor(
    private readonly queue: OciQueueService,
    private readonly configService: ConfigService,
  ) {}

  buildRunRequestedEvent(params: {
    runId: string;
    workspaceId: string;
    projectId?: string;
    repositoryFullName: string;
    pullNumber: number;
    headSha: string;
  }): AgentRunRequestedEvent {
    return {
      event: {
        kind: PR_REVIEW_REQUESTED_EVENT_KIND,
        event_type: PR_REVIEW_REQUESTED_EVENT_TYPE,
        workspace_id: params.workspaceId,
        ...(params.projectId ? { project_id: params.projectId } : {}),
        occurred_at: new Date().toISOString(),
        correlation_id: params.runId,
        payload: {
          runId: params.runId,
          pullNumber: params.pullNumber,
          headSha: params.headSha,
          repositoryFullName: params.repositoryFullName,
        },
      },
    };
  }

  async publishRunRequestedEvent(
    event: AgentRunRequestedEvent,
  ): Promise<{ queueMessageId: string }> {
    const { event: runtimeEvent } = event;
    const { runId } = runtimeEvent.payload;

    if (this.isStdoutDispatchMode()) {
      this.writeStdoutPayload('agent.run.event', event);

      return {
        queueMessageId: `${AGENT_RUN_STDOUT_QUEUE_MESSAGE_ID_PREFIX}:${runId}`,
      };
    }

    const result = await this.queue.publishMessages({
      queueKind: 'agentEvents',
      messages: [
        {
          content: JSON.stringify(event),
          metadata: {
            channelId: AGENT_RUN_QUEUE_CHANNEL,
            customProperties: {
              eventKind: runtimeEvent.kind,
              eventType: runtimeEvent.event_type,
              runId,
              workspaceId: runtimeEvent.workspace_id,
              ...(runtimeEvent.project_id
                ? { projectId: runtimeEvent.project_id }
                : {}),
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
      queueMessageId: String(message.id),
    };
  }

  private isStdoutDispatchMode(): boolean {
    return (
      (this.configService.get<string>('AGENT_RUN_DISPATCH_MODE') ?? 'oci')
        .trim()
        .toLowerCase() === 'stdout'
    );
  }

  private writeStdoutPayload(label: string, payload: unknown): void {
    process.stdout.write(`${label} ${JSON.stringify(payload, null, 2)}\n`);
  }
}
