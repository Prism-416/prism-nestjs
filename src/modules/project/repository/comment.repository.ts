import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  CommentRow,
  SearchCommentsParams,
  SearchCommentsResult,
} from '@/modules/project/types';

@Injectable()
export class CommentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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
          u.username AS "authorUsername",
          c.body,
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt"
        FROM prism_work_item_comments_l c
               INNER JOIN prism_users_l u
                          ON u.user_id = c.author_user_id
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
