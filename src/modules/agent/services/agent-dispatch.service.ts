import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OciQueueService } from '@/core/queue';
import type { AgentRunRequestedEvent } from '@/modules/agent/types';

const AGENT_RUN_QUEUE_CHANNEL = 'agent-runs';
const AGENT_RUN_EVENT_TYPE = 'agent.run.requested';
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
    projectId: string;
    agentType: string;
    requestedAt: string;
    repositoryFullName: string;
    pullNumber: number;
    headSha: string;
  }): AgentRunRequestedEvent {
    return {
      type: AGENT_RUN_EVENT_TYPE,
      version: '1.0',
      runId: params.runId,
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      agentType: params.agentType,
      requestedAt: params.requestedAt,
      target: {
        kind: 'github_pull_request',
        repositoryFullName: params.repositoryFullName,
        pullNumber: params.pullNumber,
        headSha: params.headSha,
      },
    };
  }

  async publishRunRequestedEvent(
    event: AgentRunRequestedEvent,
  ): Promise<{ queueMessageId: string }> {
    if (this.isStdoutDispatchMode()) {
      this.writeStdoutPayload('agent.run.event', event);

      return {
        queueMessageId: `${AGENT_RUN_STDOUT_QUEUE_MESSAGE_ID_PREFIX}:${event.runId}`,
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
              eventType: event.type,
              runId: event.runId,
              workspaceId: event.workspaceId,
              projectId: event.projectId,
              agentType: event.agentType,
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
