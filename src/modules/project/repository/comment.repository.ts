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
        INSERT INTO prism_work_item_comments_l (
          project_id,
          item_id,
          author_user_id,
          body
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          comment_id AS "commentId",
          project_id AS "projectId",
          item_id AS "itemId",
          author_user_id AS "authorUserId",
          body,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [params.projectId, params.itemId, params.authorUserId, params.body],
    );

    return comments[0];
  }

  async updateWorkItemComment(
    params: UpdateCommentParams,
    manager?: EntityManager,
  ): Promise<CommentRow | null> {
    const comments = await this.getManager(manager).query<CommentRow[]>(
      `
        UPDATE prism_work_item_comments_l
        SET
          body = $5,
          updated_at = NOW()
        WHERE project_id = $1
          AND item_id = $2
          AND comment_id = $3
          AND author_user_id = $4
        RETURNING
          comment_id AS "commentId",
          project_id AS "projectId",
          item_id AS "itemId",
          author_user_id AS "authorUserId",
          body,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
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
        DELETE FROM prism_work_item_comments_l
        WHERE project_id = $1
          AND item_id = $2
          AND comment_id = $3
          AND author_user_id = $4
        RETURNING comment_id AS "commentId"
      `,
      [params.projectId, params.itemId, params.commentId, params.authorUserId],
    );

    return comments.length > 0;
  }

  async findWorkItemCommentById(
    projectId: string,
    itemId: string,
    commentId: string,
    manager?: EntityManager,
  ): Promise<Pick<CommentRow, 'commentId'> | null> {
    const comments = await this.getManager(manager).query<
      Array<Pick<CommentRow, 'commentId'>>
    >(
      `
        SELECT comment_id AS "commentId"
        FROM prism_work_item_comments_l
        WHERE project_id = $1
          AND item_id = $2
          AND comment_id = $3
        LIMIT 1
      `,
      [projectId, itemId, commentId],
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
          c.project_id AS "projectId",
          c.item_id AS "itemId",
          c.author_user_id AS "authorUserId",
          c.body,
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt"
        FROM prism_work_item_comments_l c
        WHERE c.project_id = $1
          AND c.item_id = $2
        ORDER BY c.created_at ASC, c.comment_id ASC
        LIMIT $3
        OFFSET $4
      `,
      [params.projectId, params.itemId, params.limit, params.offset],
    );

    const counts = await this.getManager(manager).query<
      Array<{ total: number }>
    >(
      `
        SELECT COUNT(*)::int AS total
        FROM prism_work_item_comments_l
        WHERE project_id = $1
          AND item_id = $2
      `,
      [params.projectId, params.itemId],
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
              FROM jsonb_array_elements_text($8::jsonb) WITH ORDINALITY AS embedding_value(value, ordinality)
            ) AS embedding
        )
        INSERT INTO prism_work_item_comment_embeddings_l (
          comment_id,
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
          c.project_id,
          c.item_id,
          input_embedding.embedding,
          $4,
          $5,
          $6,
          $7
        FROM prism_work_item_comments_l c
               CROSS JOIN input_embedding
        WHERE c.project_id = $1
          AND c.item_id = $2
          AND c.comment_id = $3
          AND c.body = $4
        ON CONFLICT (comment_id)
        DO UPDATE SET
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
