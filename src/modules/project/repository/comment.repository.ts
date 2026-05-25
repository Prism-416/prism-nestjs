import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  CommentRow,
  CreateCommentParams,
  DeleteCommentParams,
  SearchCommentsParams,
  SearchCommentsResult,
  UpdateCommentParams,
  UpsertWorkItemCommentEmbeddingParams,
  WorkItemCommentEmbeddingRow,
} from '@/modules/project/types';

@Injectable()
export class CommentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createWorkItemComment(
    params: CreateCommentParams,
    manager?: EntityManager,
  ): Promise<CommentRow> {
    const comments = await this.getManager(manager).query<CommentRow[]>(
      `
        WITH inserted_comment AS (
          INSERT INTO prism_work_item_comments_l (
            workspace_id,
            item_id,
            author_user_id,
            body
          )
          VALUES ($1, $3, $4, $5)
          RETURNING
            comment_id,
            workspace_id,
            item_id,
            author_user_id,
            body,
            created_at,
            updated_at
        )
        SELECT
          c.comment_id AS "commentId",
          c.workspace_id AS "workspaceId",
          wi.project_id AS "projectId",
          c.item_id AS "itemId",
          c.author_user_id AS "authorUserId",
          c.body,
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt"
        FROM inserted_comment c
               INNER JOIN prism_work_items_l wi
                          ON wi.workspace_id = c.workspace_id
                         AND wi.item_id = c.item_id
                         AND wi.project_id = $2
      `,
      [
        params.workspaceId,
        params.projectId,
        params.itemId,
        params.authorUserId,
        params.body,
      ],
    );

    return comments[0];
  }

  async updateWorkItemComment(
    params: UpdateCommentParams,
    manager?: EntityManager,
  ): Promise<CommentRow | null> {
    const comments = await this.getManager(manager).query<CommentRow[]>(
      `
        WITH updated_comment AS (
          UPDATE prism_work_item_comments_l
          SET
            body = $6,
            updated_at = NOW()
          WHERE workspace_id = $1
            AND item_id = $3
            AND comment_id = $4
            AND author_user_id = $5
          RETURNING
            comment_id,
            workspace_id,
            item_id,
            author_user_id,
            body,
            created_at,
            updated_at
        )
        SELECT
          c.comment_id AS "commentId",
          c.workspace_id AS "workspaceId",
          wi.project_id AS "projectId",
          c.item_id AS "itemId",
          c.author_user_id AS "authorUserId",
          c.body,
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt"
        FROM updated_comment c
               INNER JOIN prism_work_items_l wi
                          ON wi.workspace_id = c.workspace_id
                         AND wi.item_id = c.item_id
                         AND wi.project_id = $2
      `,
      [
        params.workspaceId,
        params.projectId,
        params.itemId,
        params.commentId,
        params.authorUserId,
        params.body,
      ],
    );

    return comments[0] ?? null;
  }

  async deleteWorkItemComment(
    params: DeleteCommentParams,
    manager?: EntityManager,
  ): Promise<boolean> {
    const comments = await this.getManager(manager).query<
      Array<{ commentId: string }>
    >(
      `
        DELETE FROM prism_work_item_comments_l c
        USING prism_work_items_l wi
        WHERE c.workspace_id = $1
          AND wi.workspace_id = c.workspace_id
          AND wi.project_id = $2
          AND c.item_id = $3
          AND wi.item_id = c.item_id
          AND c.comment_id = $4
          AND c.author_user_id = $5
        RETURNING c.comment_id AS "commentId"
      `,
      [
        params.workspaceId,
        params.projectId,
        params.itemId,
        params.commentId,
        params.authorUserId,
      ],
    );

    return comments.length > 0;
  }

  async findWorkItemCommentById(
    workspaceId: string,
    projectId: string,
    itemId: string,
    commentId: string,
    manager?: EntityManager,
  ): Promise<Pick<CommentRow, 'commentId'> | null> {
    const comments = await this.getManager(manager).query<
      Array<Pick<CommentRow, 'commentId'>>
    >(
      `
        SELECT c.comment_id AS "commentId"
        FROM prism_work_item_comments_l c
               INNER JOIN prism_work_items_l wi
                          ON wi.workspace_id = c.workspace_id
                         AND wi.item_id = c.item_id
        WHERE c.workspace_id = $1
          AND wi.project_id = $2
          AND c.item_id = $3
          AND c.comment_id = $4
        LIMIT 1
      `,
      [workspaceId, projectId, itemId, commentId],
    );

    return comments[0] ?? null;
  }

  async searchWorkItemComments(
    params: SearchCommentsParams,
    manager?: EntityManager,
  ): Promise<SearchCommentsResult> {
    const comments = await this.getManager(manager).query<CommentRow[]>(
      `
        SELECT
          c.comment_id AS "commentId",
          c.workspace_id AS "workspaceId",
          wi.project_id AS "projectId",
          c.item_id AS "itemId",
          c.author_user_id AS "authorUserId",
          c.body,
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt"
        FROM prism_work_item_comments_l c
               INNER JOIN prism_work_items_l wi
                          ON wi.workspace_id = c.workspace_id
                         AND wi.item_id = c.item_id
        WHERE c.workspace_id = $1
          AND wi.project_id = $2
          AND c.item_id = $3
        ORDER BY c.created_at ASC, c.comment_id ASC
        LIMIT $4
        OFFSET $5
      `,
      [
        params.workspaceId,
        params.projectId,
        params.itemId,
        params.limit,
        params.offset,
      ],
    );

    const counts = await this.getManager(manager).query<
      Array<{ total: number }>
    >(
      `
        SELECT COUNT(*)::int AS total
        FROM prism_work_item_comments_l c
               INNER JOIN prism_work_items_l wi
                          ON wi.workspace_id = c.workspace_id
                         AND wi.item_id = c.item_id
        WHERE c.workspace_id = $1
          AND wi.project_id = $2
          AND c.item_id = $3
      `,
      [params.workspaceId, params.projectId, params.itemId],
    );

    return {
      comments,
      total: counts[0]?.total ?? 0,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async upsertWorkItemCommentEmbedding(
    params: UpsertWorkItemCommentEmbeddingParams,
    manager?: EntityManager,
  ): Promise<WorkItemCommentEmbeddingRow | null> {
    const embeddings = await this.getManager(manager).query<
      WorkItemCommentEmbeddingRow[]
    >(
      `
        WITH input_embedding AS (
          SELECT
            (
              SELECT ('[' || string_agg(embedding_value.value, ',' ORDER BY embedding_value.ordinality) || ']')::vector
              FROM jsonb_array_elements_text($9::jsonb) WITH ORDINALITY AS embedding_value(value, ordinality)
            ) AS embedding
        )
        INSERT INTO prism_work_item_comment_embeddings_l (
          comment_id,
          workspace_id,
          project_id,
          item_id,
          embedding,
          embedded_body,
          content_hash,
          model,
          dimensions
        )
        SELECT
          c.comment_id,
          c.workspace_id,
          wi.project_id,
          c.item_id,
          input_embedding.embedding,
          $5,
          $6,
          $7,
          $8
        FROM prism_work_item_comments_l c
               INNER JOIN prism_work_items_l wi
                          ON wi.workspace_id = c.workspace_id
                         AND wi.item_id = c.item_id
               CROSS JOIN input_embedding
        WHERE c.workspace_id = $1
          AND wi.project_id = $2
          AND c.item_id = $3
          AND c.comment_id = $4
          AND c.body = $5
        ON CONFLICT (comment_id)
        DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          project_id = EXCLUDED.project_id,
          item_id = EXCLUDED.item_id,
          embedding = EXCLUDED.embedding,
          embedded_body = EXCLUDED.embedded_body,
          content_hash = EXCLUDED.content_hash,
          model = EXCLUDED.model,
          dimensions = EXCLUDED.dimensions,
          embedded_at = NOW()
        RETURNING
          comment_id AS "commentId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          item_id AS "itemId",
          embedded_body AS "embeddedBody",
          content_hash AS "contentHash",
          model,
          dimensions,
          created_at AS "createdAt",
          embedded_at AS "embeddedAt"
      `,
      [
        params.workspaceId,
        params.projectId,
        params.itemId,
        params.commentId,
        params.embeddedBody,
        params.contentHash,
        params.model,
        params.dimensions,
        JSON.stringify(params.embedding),
      ],
    );

    return embeddings[0] ?? null;
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
