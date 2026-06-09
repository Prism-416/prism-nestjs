import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { OciObjectStorageService } from '@/core/object-storage/oci-object-storage.service';

type ObjectDeletionRow = {
  deletionId: string;
  objectName: string;
  storageVersionId: string | null;
  attempts: number;
};

@Injectable()
export class ObjectStorageDeletionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  // Stop retrying a permanently failing deletion after this many attempts so a
  // single poisoned object cannot be retried forever. The row is kept (not
  // completed) for operator visibility, but parked out of the retry window.
  private static readonly MAX_ATTEMPTS = 10;

  // Visibility timeout: how long a claimed row stays hidden from other workers
  // while it is being processed. Long enough to cover a slow delete call.
  private static readonly LEASE_SECONDS = 300;

  private readonly logger = new Logger(ObjectStorageDeletionService.name);
  private retryTimer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    private readonly objectStorageService: OciObjectStorageService,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.dataSource) {
      return;
    }

    this.retryTimer = setInterval(() => {
      void this.processPending();
    }, 60_000);
    this.retryTimer.unref();
    void this.processPending();
  }

  onApplicationShutdown(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
  }

  async enqueue(
    params: {
      objectName: string;
      storageVersionId?: string;
      reason: string;
    },
    manager?: EntityManager,
  ): Promise<string | null> {
    if (!this.dataSource && !manager) {
      return null;
    }

    const deletionId = randomUUID();
    await this.getManager(manager).query(
      `
        INSERT INTO prism_object_deletion_queue_l (
          deletion_id,
          object_name,
          storage_version_id,
          reason
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        deletionId,
        params.objectName,
        params.storageVersionId ?? null,
        params.reason,
      ],
    );

    return deletionId;
  }

  async enqueueAndProcess(params: {
    objectName: string;
    storageVersionId?: string;
    reason: string;
  }): Promise<void> {
    const deletionId = await this.enqueue(params);

    if (deletionId) {
      await this.processDeletion(deletionId);
      return;
    }

    try {
      await this.objectStorageService.deleteObject({
        objectName: params.objectName,
        versionId: params.storageVersionId,
      });
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? error.message
          : 'Object storage deletion failed without a database queue.',
      );
    }
  }

  async processDeletion(deletionId: string): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    const rows = await this.dataSource.query<ObjectDeletionRow[]>(
      `
        SELECT
          deletion_id AS "deletionId",
          object_name AS "objectName",
          storage_version_id AS "storageVersionId",
          attempts
        FROM prism_object_deletion_queue_l
        WHERE deletion_id = $1
          AND completed_at IS NULL
        LIMIT 1
      `,
      [deletionId],
    );
    const deletion = rows[0];

    if (!deletion) {
      return;
    }

    await this.executeDeletion(deletion);
  }

  async processPending(): Promise<void> {
    if (!this.dataSource || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Atomically claim a batch with FOR UPDATE SKIP LOCKED so concurrent
      // workers (e.g. multiple app instances) never pick the same rows. The
      // claim leases each row by pushing next_attempt_at into the future;
      // executeDeletion then overwrites that with the final completed_at or
      // the real backoff time. If a worker dies mid-batch, the lease expires
      // and the row becomes eligible again.
      const rows = await this.dataSource.query<ObjectDeletionRow[]>(
        `
          WITH claimed AS (
            SELECT deletion_id
            FROM prism_object_deletion_queue_l
            WHERE completed_at IS NULL
              AND next_attempt_at <= NOW()
            ORDER BY next_attempt_at, created_at
            LIMIT 25
            FOR UPDATE SKIP LOCKED
          )
          UPDATE prism_object_deletion_queue_l q
          SET next_attempt_at = NOW() + make_interval(secs => $1)
          FROM claimed
          WHERE q.deletion_id = claimed.deletion_id
          RETURNING
            q.deletion_id AS "deletionId",
            q.object_name AS "objectName",
            q.storage_version_id AS "storageVersionId",
            q.attempts
        `,
        [ObjectStorageDeletionService.LEASE_SECONDS],
      );

      for (const row of rows) {
        await this.executeDeletion(row);
      }
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? error.message
          : 'Pending object storage deletions could not be processed.',
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeDeletion(deletion: ObjectDeletionRow): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    try {
      await this.objectStorageService.deleteObject({
        objectName: deletion.objectName,
        versionId: deletion.storageVersionId ?? undefined,
      });
      await this.dataSource.query(
        `
          UPDATE prism_object_deletion_queue_l
          SET completed_at = NOW(),
              last_error = NULL
          WHERE deletion_id = $1
        `,
        [deletion.deletionId],
      );
    } catch (error) {
      const attempts = deletion.attempts + 1;
      const message =
        error instanceof Error
          ? error.message
          : 'Object storage deletion failed.';

      if (attempts >= ObjectStorageDeletionService.MAX_ATTEMPTS) {
        // Give up: park the row out of the retry window ('infinity') but keep
        // it so operators can inspect and reprocess it manually if needed.
        await this.dataSource.query(
          `
            UPDATE prism_object_deletion_queue_l
            SET attempts = $2,
                next_attempt_at = 'infinity',
                last_error = $3
            WHERE deletion_id = $1
          `,
          [deletion.deletionId, attempts, message.slice(0, 2000)],
        );
        this.logger.error(
          `Object storage deletion permanently failed after ${attempts} attempts for "${deletion.objectName}": ${message}`,
        );
        return;
      }

      const retryDelaySeconds = Math.min(3600, 30 * 2 ** Math.min(attempts, 7));
      const nextAttemptAt = new Date(Date.now() + retryDelaySeconds * 1000);

      await this.dataSource.query(
        `
          UPDATE prism_object_deletion_queue_l
          SET attempts = $2,
              next_attempt_at = $3,
              last_error = $4
          WHERE deletion_id = $1
        `,
        [deletion.deletionId, attempts, nextAttemptAt, message.slice(0, 2000)],
      );
      this.logger.warn(message);
    }
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    if (manager) {
      return manager;
    }

    if (!this.dataSource) {
      throw new Error('Database connection is required for deletion queue.');
    }

    return this.dataSource;
  }
}
