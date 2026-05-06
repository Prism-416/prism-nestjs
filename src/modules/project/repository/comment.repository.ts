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

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
