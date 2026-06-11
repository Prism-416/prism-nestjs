import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OciObjectStorageService } from '@/core/object-storage';
import { OciQueueService } from '@/core/queue';
import {
  PULL_REQUEST_REVIEW_DIFF_SCHEMA_VERSION,
  type AgentRunRequestedEvent,
  type PullRequestReviewDiffPayload,
} from '@/modules/agent/types';
import type { GithubPullRequestContent } from '@/modules/github/types';

const AGENT_RUN_QUEUE_CHANNEL = 'agent-runs';
const PR_REVIEW_REQUESTED_EVENT_KIND = 'domain';
const PR_REVIEW_REQUESTED_EVENT_TYPE = 'pr.review_requested';
const AGENT_RUN_STDOUT_QUEUE_MESSAGE_ID_PREFIX = 'stdout';

@Injectable()
export class AgentDispatchService {
  constructor(
    private readonly queue: OciQueueService,
    private readonly objectStorage: OciObjectStorageService,
    private readonly configService: ConfigService,
  ) {}

  buildPullRequestDiffObjectName(params: {
    workspaceId: string;
    runId: string;
  }): string {
    return [
      'workspaces',
      params.workspaceId,
      'pull-request-reviews',
      `${params.runId}.json`,
    ].join('/');
  }

  async uploadPullRequestDiff(params: {
    objectName: string;
    runId: string;
    workspaceId: string;
    repositoryFullName: string;
    pullNumber: number;
    headSha: string;
    pullRequest: GithubPullRequestContent;
  }): Promise<{ diffObjectVersionId: string | null }> {
    const payload: PullRequestReviewDiffPayload = {
      schemaVersion: PULL_REQUEST_REVIEW_DIFF_SCHEMA_VERSION,
      runId: params.runId,
      workspaceId: params.workspaceId,
      repositoryFullName: params.repositoryFullName,
      pullNumber: params.pullNumber,
      headSha: params.headSha,
      pullRequest: params.pullRequest,
    };
    const result = await this.objectStorage.putObject({
      bucketKind: 'agentPayload',
      objectName: params.objectName,
      body: JSON.stringify(payload),
      contentType: 'application/json',
      metadata: {
        schemaVersion: payload.schemaVersion,
        runId: payload.runId,
        workspaceId: payload.workspaceId,
        pullNumber: String(payload.pullNumber),
      },
    });

    return {
      diffObjectVersionId: result.versionId || null,
    };
  }

  buildRunRequestedEvent(params: {
    runId: string;
    workspaceId: string;
    projectId?: string;
    repositoryFullName: string;
    pullNumber: number;
    headSha: string;
    diffObjectName?: string;
    diffObjectVersionId?: string | null;
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
          ...(params.diffObjectName
            ? { diffObjectName: params.diffObjectName }
            : {}),
          ...(params.diffObjectVersionId
            ? { diffObjectVersionId: params.diffObjectVersionId }
            : {}),
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
