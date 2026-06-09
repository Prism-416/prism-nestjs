import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  CreateDocumentParams,
  DeletedDocumentRow,
  DocumentChunkEmbeddingRow,
  DocumentChunkRow,
  DocumentDownloadRef,
  DocumentMemberProjectRow,
  DocumentProjectRow,
  DocumentRow,
  DocumentSourceGroupRow,
  SearchDocumentsParams,
  SearchDocumentsResult,
  UpsertDocumentChunkEmbeddingsParams,
  UpsertDocumentChunksParams,
} from '@/modules/document/types';

type DocumentDbRow = Omit<DocumentRow, 'sizeBytes'> & {
  sizeBytes: string | number;
};

@Injectable()
export class DocumentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findProjectByIdAndMemberUserId(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<DocumentMemberProjectRow | null> {
    const projects = await this.getManager(manager).query<
      DocumentMemberProjectRow[]
    >(
      `
        SELECT
          p.project_id AS "projectId",
          p.workspace_id AS "workspaceId",
          wm.role AS "role"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.status <> 'archived'
        LIMIT 1
      `,
      [projectId, userId],
    );

    return projects[0] ?? null;
  }

  async findProjectById(
    projectId: string,
    manager?: EntityManager,
  ): Promise<DocumentProjectRow | null> {
    const projects = await this.getManager(manager).query<DocumentProjectRow[]>(
      `
        SELECT
          p.project_id AS "projectId",
          p.workspace_id AS "workspaceId"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND w.deleted_at IS NULL
          AND w.status = 'active'
          AND p.status <> 'archived'
        LIMIT 1
      `,
      [projectId],
    );

    return projects[0] ?? null;
  }

  async searchDocuments(
    params: SearchDocumentsParams,
    manager?: EntityManager,
  ): Promise<SearchDocumentsResult> {
    type SearchDocumentDbRow = {
      documentId: string | null;
      workspaceId: string | null;
      projectId: string | null;
      title: string | null;
      description: string | null;
      fileName: string | null;
      contentType: string | null;
      sizeBytes: string | number | null;
      storageETag: string | null;
      storageVersionId: string | null;
      sourceKind: 'direct' | 'work_item' | null;
      sourceWorkItemId: string | null;
      sourceWorkItemIdSnapshot: string | null;
      sourceWorkItemTitle: string | null;
      sourceWorkItemTitleSnapshot: string | null;
      sourceCommentId: string | null;
      createdBy: string | null;
      updatedBy: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      total: number;
    };

    const rows = await this.getManager(manager).query<SearchDocumentDbRow[]>(
      `
        WITH filtered_documents AS (
          SELECT
            d.document_id,
            d.workspace_id,
            d.project_id,
            d.title,
            d.description,
            d.file_name,
            d.content_type,
            d.size_bytes,
            d.storage_etag,
            d.storage_version_id,
            d.source_kind,
            d.source_work_item_id,
            d.source_work_item_id_snapshot,
            d.source_work_item_title_snapshot,
            d.source_comment_id,
            d.created_by,
            d.updated_by,
            d.created_at,
            d.updated_at
          FROM prism_documents_l d
          WHERE d.workspace_id = $1
            AND d.project_id = $2
            AND (
              d.source_kind = 'direct'
              OR EXISTS (
                SELECT 1
                FROM prism_work_items_l wi_visible
                WHERE wi_visible.workspace_id = d.workspace_id
                  AND wi_visible.project_id = d.project_id
                  AND wi_visible.item_id = d.source_work_item_id
                  AND wi_visible.deleted_at IS NULL
              )
            )
            AND (
              $3::text IS NULL
              OR d.title ILIKE '%' || $3 || '%'
              OR d.file_name ILIKE '%' || $3 || '%'
              OR d.description ILIKE '%' || $3 || '%'
              OR d.source_work_item_title_snapshot ILIKE '%' || $3 || '%'
              OR EXISTS (
                SELECT 1
                FROM prism_work_items_l wi_search
                WHERE wi_search.workspace_id = d.workspace_id
                  AND wi_search.project_id = d.project_id
                  AND wi_search.item_id = d.source_work_item_id
                  AND wi_search.deleted_at IS NULL
                  AND wi_search.title ILIKE '%' || $3 || '%'
              )
            )
            AND (
              $4::uuid IS NULL
              OR d.source_work_item_id = $4::uuid
            )
            AND (
              $5::text IS NULL
              OR (
                $5 = 'direct'
                AND d.source_kind = 'direct'
              )
              OR (
                $5 = 'work_item'
                AND d.source_kind = 'work_item'
              )
            )
        ),
        total_count AS (
          SELECT COUNT(*)::int AS total
          FROM filtered_documents
        ),
        paged_documents AS (
          SELECT *
          FROM filtered_documents
          ORDER BY created_at DESC, document_id DESC
          LIMIT $6
          OFFSET $7
        )
        SELECT
          pd.document_id AS "documentId",
          pd.workspace_id AS "workspaceId",
          pd.project_id AS "projectId",
          pd.title,
          pd.description,
          pd.file_name AS "fileName",
          pd.content_type AS "contentType",
          pd.size_bytes AS "sizeBytes",
          pd.storage_etag AS "storageETag",
          pd.storage_version_id AS "storageVersionId",
          pd.source_kind AS "sourceKind",
          pd.source_work_item_id AS "sourceWorkItemId",
          pd.source_work_item_id_snapshot AS "sourceWorkItemIdSnapshot",
          wi.title AS "sourceWorkItemTitle",
          pd.source_work_item_title_snapshot AS "sourceWorkItemTitleSnapshot",
          pd.source_comment_id AS "sourceCommentId",
          pd.created_by AS "createdBy",
          pd.updated_by AS "updatedBy",
          pd.created_at AS "createdAt",
          pd.updated_at AS "updatedAt",
          tc.total
        FROM total_count tc
               LEFT JOIN paged_documents pd
                         ON TRUE
               LEFT JOIN prism_work_items_l wi
                        ON wi.workspace_id = pd.workspace_id
                        AND wi.project_id = pd.project_id
                        AND wi.item_id = pd.source_work_item_id
                        AND wi.deleted_at IS NULL
        ORDER BY pd.created_at DESC NULLS LAST,
                 pd.document_id DESC NULLS LAST
      `,
      [
        params.workspaceId,
        params.projectId,
        params.query ?? null,
        params.workItemId ?? null,
        params.source ?? null,
        params.limit,
        params.offset,
      ],
    );

    return {
      items: rows
        .filter(
          (row): row is SearchDocumentDbRow & { documentId: string } =>
            row.documentId !== null,
        )
        .map((row) =>
          this.mapDocumentRow({
            documentId: row.documentId,
            workspaceId: row.workspaceId as string,
            projectId: row.projectId as string,
            title: row.title as string,
            description: row.description,
            fileName: row.fileName as string,
            contentType: row.contentType as string,
            sizeBytes: row.sizeBytes as string | number,
            storageETag: row.storageETag,
            storageVersionId: row.storageVersionId,
            sourceKind: row.sourceKind as 'direct' | 'work_item',
            sourceWorkItemId: row.sourceWorkItemId,
            sourceWorkItemIdSnapshot: row.sourceWorkItemIdSnapshot,
            sourceWorkItemTitle: row.sourceWorkItemTitle,
            sourceWorkItemTitleSnapshot: row.sourceWorkItemTitleSnapshot,
            sourceCommentId: row.sourceCommentId,
            createdBy: row.createdBy as string,
            updatedBy: row.updatedBy as string,
            createdAt: row.createdAt as Date,
            updatedAt: row.updatedAt as Date,
          }),
        ),
      total: rows[0]?.total ?? 0,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async searchDocumentGroups(
    params: SearchDocumentsParams,
    manager?: EntityManager,
  ): Promise<DocumentSourceGroupRow[]> {
    const rows = await this.getManager(manager).query<
      Array<Omit<DocumentSourceGroupRow, 'count'> & { count: number | string }>
    >(
      `
        WITH filtered_documents AS (
          SELECT
            d.source_kind,
            d.source_work_item_id,
            d.source_work_item_id_snapshot,
            d.source_work_item_title_snapshot,
            wi.item_id AS live_work_item_id,
            wi.title AS live_work_item_title
          FROM prism_documents_l d
                 LEFT JOIN prism_work_items_l wi
                           ON wi.workspace_id = d.workspace_id
                          AND wi.project_id = d.project_id
                          AND wi.item_id = d.source_work_item_id
                          AND wi.deleted_at IS NULL
          WHERE d.workspace_id = $1
            AND d.project_id = $2
            AND (
              d.source_kind = 'direct'
              OR wi.item_id IS NOT NULL
            )
            AND (
              $3::text IS NULL
              OR d.title ILIKE '%' || $3 || '%'
              OR d.file_name ILIKE '%' || $3 || '%'
              OR d.description ILIKE '%' || $3 || '%'
              OR d.source_work_item_title_snapshot ILIKE '%' || $3 || '%'
              OR wi.title ILIKE '%' || $3 || '%'
            )
            AND (
              $4::uuid IS NULL
              OR d.source_work_item_id = $4::uuid
            )
            AND (
              $5::text IS NULL
              OR ($5 = 'direct' AND d.source_kind = 'direct')
              OR (
                $5 = 'work_item'
                AND d.source_kind = 'work_item'
              )
            )
        )
        SELECT
          source_kind AS "kind",
          source_work_item_id AS "workItemId",
          CASE
            WHEN source_kind = 'direct' THEN NULL
            ELSE COALESCE(source_work_item_id_snapshot, source_work_item_id)
          END AS "workItemIdSnapshot",
          CASE
            WHEN source_kind = 'direct' THEN 'Direct uploads'
            ELSE live_work_item_title
          END AS "title",
          COUNT(*)::int AS "count"
        FROM filtered_documents
        GROUP BY
          source_kind,
          source_work_item_id,
          source_work_item_id_snapshot,
          live_work_item_title
        ORDER BY "kind", "title"
      `,
      [
        params.workspaceId,
        params.projectId,
        params.query ?? null,
        params.workItemId ?? null,
        params.source ?? null,
      ],
    );

    return rows.map((row) => ({ ...row, count: Number(row.count) }));
  }

  async findDocumentsByCommentIds(
    workspaceId: string,
    projectId: string,
    commentIds: string[],
    manager?: EntityManager,
  ): Promise<DocumentRow[]> {
    if (commentIds.length === 0) {
      return [];
    }

    const documents = await this.getManager(manager).query<DocumentDbRow[]>(
      `
        SELECT
          d.document_id AS "documentId",
          d.workspace_id AS "workspaceId",
          d.project_id AS "projectId",
          d.title,
          d.description,
          d.file_name AS "fileName",
          d.content_type AS "contentType",
          d.size_bytes AS "sizeBytes",
          d.storage_etag AS "storageETag",
          d.storage_version_id AS "storageVersionId",
          d.source_kind AS "sourceKind",
          d.source_work_item_id AS "sourceWorkItemId",
          d.source_work_item_id_snapshot AS "sourceWorkItemIdSnapshot",
          wi.title AS "sourceWorkItemTitle",
          d.source_work_item_title_snapshot AS "sourceWorkItemTitleSnapshot",
          d.source_comment_id AS "sourceCommentId",
          d.created_by AS "createdBy",
          d.updated_by AS "updatedBy",
          d.created_at AS "createdAt",
          d.updated_at AS "updatedAt"
        FROM prism_documents_l d
               LEFT JOIN prism_work_items_l wi
                         ON wi.workspace_id = d.workspace_id
                        AND wi.project_id = d.project_id
                        AND wi.item_id = d.source_work_item_id
                        AND wi.deleted_at IS NULL
        WHERE d.workspace_id = $1
          AND d.project_id = $2
          AND d.source_comment_id = ANY($3::uuid[])
        ORDER BY d.created_at, d.document_id
      `,
      [workspaceId, projectId, commentIds],
    );

    return documents.map((document) => this.mapDocumentRow(document));
  }

  async findDocumentById(
    workspaceId: string,
    projectId: string,
    documentId: string,
    manager?: EntityManager,
  ): Promise<DocumentRow | null> {
    const documents = await this.getManager(manager).query<DocumentDbRow[]>(
      `
        SELECT
          document_id AS "documentId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          title,
          description,
          file_name AS "fileName",
          content_type AS "contentType",
          size_bytes AS "sizeBytes",
          storage_etag AS "storageETag",
          storage_version_id AS "storageVersionId",
          source_kind AS "sourceKind",
          source_work_item_id AS "sourceWorkItemId",
          source_work_item_id_snapshot AS "sourceWorkItemIdSnapshot",
          NULL AS "sourceWorkItemTitle",
          source_work_item_title_snapshot AS "sourceWorkItemTitleSnapshot",
          source_comment_id AS "sourceCommentId",
          created_by AS "createdBy",
          updated_by AS "updatedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM prism_documents_l
        WHERE workspace_id = $1
          AND project_id = $2
          AND document_id = $3
          AND (
            source_kind = 'direct'
            OR EXISTS (
              SELECT 1
              FROM prism_work_items_l wi_visible
              WHERE wi_visible.workspace_id = prism_documents_l.workspace_id
                AND wi_visible.project_id = prism_documents_l.project_id
                AND wi_visible.item_id = prism_documents_l.source_work_item_id
                AND wi_visible.deleted_at IS NULL
            )
          )
        LIMIT 1
      `,
      [workspaceId, projectId, documentId],
    );

    return documents[0] ? this.mapDocumentRow(documents[0]) : null;
  }

  async findDocumentDownloadRef(
    workspaceId: string,
    projectId: string,
    documentId: string,
    manager?: EntityManager,
  ): Promise<DocumentDownloadRef | null> {
    type DownloadRefDbRow = Omit<DocumentDownloadRef, 'sizeBytes'> & {
      sizeBytes: string | number;
    };

    const refs = await this.getManager(manager).query<DownloadRefDbRow[]>(
      `
        SELECT
          file_name AS "fileName",
          content_type AS "contentType",
          size_bytes AS "sizeBytes",
          storage_object_name AS "storageObjectName",
          storage_version_id AS "storageVersionId"
        FROM prism_documents_l
        WHERE workspace_id = $1
          AND project_id = $2
          AND document_id = $3
          AND (
            source_kind = 'direct'
            OR EXISTS (
              SELECT 1
              FROM prism_work_items_l wi_visible
              WHERE wi_visible.workspace_id = prism_documents_l.workspace_id
                AND wi_visible.project_id = prism_documents_l.project_id
                AND wi_visible.item_id = prism_documents_l.source_work_item_id
                AND wi_visible.deleted_at IS NULL
            )
          )
        LIMIT 1
      `,
      [workspaceId, projectId, documentId],
    );

    const ref = refs[0];
    if (!ref) {
      return null;
    }

    return { ...ref, sizeBytes: Number(ref.sizeBytes) };
  }

  async createDocument(
    params: CreateDocumentParams,
    manager?: EntityManager,
  ): Promise<DocumentRow> {
    const documents = await this.getManager(manager).query<DocumentDbRow[]>(
      `
        INSERT INTO prism_documents_l (
          document_id,
          workspace_id,
          project_id,
          title,
          description,
          file_name,
          content_type,
          size_bytes,
          storage_object_name,
          storage_etag,
          storage_version_id,
          source_kind,
          source_work_item_id,
          source_work_item_id_snapshot,
          source_work_item_title_snapshot,
          source_comment_id,
          created_by,
          updated_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          $17
        )
        RETURNING
          document_id AS "documentId",
          workspace_id AS "workspaceId",
          project_id AS "projectId",
          title,
          description,
          file_name AS "fileName",
          content_type AS "contentType",
          size_bytes AS "sizeBytes",
          storage_etag AS "storageETag",
          storage_version_id AS "storageVersionId",
          source_kind AS "sourceKind",
          source_work_item_id AS "sourceWorkItemId",
          source_work_item_id_snapshot AS "sourceWorkItemIdSnapshot",
          NULL AS "sourceWorkItemTitle",
          source_work_item_title_snapshot AS "sourceWorkItemTitleSnapshot",
          source_comment_id AS "sourceCommentId",
          created_by AS "createdBy",
          updated_by AS "updatedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        params.documentId,
        params.workspaceId,
        params.projectId,
        params.title,
        params.description ?? null,
        params.fileName,
        params.contentType,
        params.sizeBytes,
        params.storageObjectName,
        params.storageETag ?? null,
        params.storageVersionId ?? null,
        params.sourceKind ?? 'direct',
        params.sourceWorkItemId ?? null,
        params.sourceWorkItemIdSnapshot ?? null,
        params.sourceWorkItemTitleSnapshot ?? null,
        params.sourceCommentId ?? null,
        params.createdBy,
      ],
    );

    return this.mapDocumentRow(documents[0]);
  }

  async upsertDocumentChunks(
    params: UpsertDocumentChunksParams,
    manager?: EntityManager,
  ): Promise<DocumentChunkRow[]> {
    const rows = await this.getManager(manager).query<DocumentChunkRow[]>(
      `
        WITH input_chunks AS (
          SELECT
            (chunk.value ->> 'chunkIndex')::int AS chunk_index,
            CASE
              WHEN jsonb_typeof(chunk.value -> 'headingPath') = 'array'
                THEN ARRAY(
                  SELECT jsonb_array_elements_text(chunk.value -> 'headingPath')
                )
              ELSE NULL
            END AS heading_path,
            chunk.value ->> 'content' AS content,
            chunk.value ->> 'contentHash' AS content_hash,
            (chunk.value ->> 'tokenCount')::int AS token_count,
            (chunk.value ->> 'charCount')::int AS char_count,
            chunk.ordinality
          FROM jsonb_array_elements($4::jsonb) WITH ORDINALITY AS chunk(value, ordinality)
        ),
        upserted_chunks AS (
          INSERT INTO prism_document_chunks_l (
            document_id,
            workspace_id,
            project_id,
            chunk_index,
            heading_path,
            content,
            content_hash,
            token_count,
            char_count
          )
          SELECT
            $3,
            $1,
            $2,
            input_chunks.chunk_index,
            input_chunks.heading_path,
            input_chunks.content,
            input_chunks.content_hash,
            input_chunks.token_count,
            input_chunks.char_count
          FROM input_chunks
          ON CONFLICT (document_id, chunk_index)
          DO UPDATE SET
            workspace_id = EXCLUDED.workspace_id,
            project_id = EXCLUDED.project_id,
            heading_path = EXCLUDED.heading_path,
            content = EXCLUDED.content,
            content_hash = EXCLUDED.content_hash,
            token_count = EXCLUDED.token_count,
            char_count = EXCLUDED.char_count,
            updated_at = NOW()
          RETURNING
            chunk_id AS "chunkId",
            document_id AS "documentId",
            workspace_id AS "workspaceId",
            project_id AS "projectId",
            chunk_index AS "chunkIndex",
            heading_path AS "headingPath",
            content_hash AS "contentHash",
            token_count AS "tokenCount",
            char_count AS "charCount",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        )
        SELECT
          upserted_chunks."chunkId",
          upserted_chunks."documentId",
          upserted_chunks."workspaceId",
          upserted_chunks."projectId",
          upserted_chunks."chunkIndex",
          upserted_chunks."headingPath",
          upserted_chunks."contentHash",
          upserted_chunks."tokenCount",
          upserted_chunks."charCount",
          upserted_chunks."createdAt",
          upserted_chunks."updatedAt"
        FROM upserted_chunks
               INNER JOIN input_chunks
                          ON input_chunks.chunk_index = upserted_chunks."chunkIndex"
        ORDER BY input_chunks.ordinality
      `,
      [
        params.workspaceId,
        params.projectId,
        params.documentId,
        JSON.stringify(params.chunks),
      ],
    );

    return rows;
  }

  async upsertDocumentChunkEmbeddings(
    params: UpsertDocumentChunkEmbeddingsParams,
    manager?: EntityManager,
  ): Promise<DocumentChunkEmbeddingRow[]> {
    const rows = await this.getManager(manager).query<
      DocumentChunkEmbeddingRow[]
    >(
      `
        WITH input_embeddings AS (
          SELECT
            (embedding.value ->> 'chunkId')::uuid AS chunk_id,
            embedding.value ->> 'contentHash' AS content_hash,
            embedding.value ->> 'model' AS model,
            (embedding.value ->> 'dimensions')::int AS dimensions,
            (
              SELECT ('[' || string_agg(embedding_value.value, ',') || ']')::vector
              FROM jsonb_array_elements_text(embedding.value -> 'embedding') AS embedding_value(value)
            ) AS embedding,
            embedding.ordinality
          FROM jsonb_array_elements($4::jsonb) WITH ORDINALITY AS embedding(value, ordinality)
        ),
        matched_embeddings AS (
          SELECT
            input_embeddings.chunk_id,
            input_embeddings.content_hash,
            input_embeddings.model,
            input_embeddings.dimensions,
            input_embeddings.embedding,
            input_embeddings.ordinality
          FROM input_embeddings
                 INNER JOIN prism_document_chunks_l c
                            ON c.chunk_id = input_embeddings.chunk_id
                           AND c.workspace_id = $1
                           AND c.project_id = $2
                           AND c.document_id = $3
                           AND c.content_hash = input_embeddings.content_hash
        ),
        validated_embeddings AS (
          SELECT matched_embeddings.*
          FROM matched_embeddings
          WHERE (SELECT COUNT(*) FROM matched_embeddings) = (
            SELECT COUNT(*) FROM input_embeddings
          )
        ),
        upserted_embeddings AS (
          INSERT INTO prism_document_chunk_embeddings_l (
            chunk_id,
            workspace_id,
            project_id,
            embedding,
            model,
            dimensions,
            content_hash
          )
          SELECT
            validated_embeddings.chunk_id,
            $1,
            $2,
            validated_embeddings.embedding,
            validated_embeddings.model,
            validated_embeddings.dimensions,
            validated_embeddings.content_hash
          FROM validated_embeddings
          ON CONFLICT (chunk_id)
          DO UPDATE SET
            workspace_id = EXCLUDED.workspace_id,
            project_id = EXCLUDED.project_id,
            embedding = EXCLUDED.embedding,
            model = EXCLUDED.model,
            dimensions = EXCLUDED.dimensions,
            content_hash = EXCLUDED.content_hash,
            embedded_at = NOW()
          RETURNING
            chunk_id AS "chunkId",
            workspace_id AS "workspaceId",
            project_id AS "projectId",
            model,
            dimensions,
            content_hash AS "contentHash",
            created_at AS "createdAt",
            embedded_at AS "embeddedAt"
        )
        SELECT
          upserted_embeddings."chunkId",
          upserted_embeddings."workspaceId",
          upserted_embeddings."projectId",
          upserted_embeddings.model,
          upserted_embeddings.dimensions,
          upserted_embeddings."contentHash",
          upserted_embeddings."createdAt",
          upserted_embeddings."embeddedAt"
        FROM upserted_embeddings
               INNER JOIN input_embeddings
                          ON input_embeddings.chunk_id = upserted_embeddings."chunkId"
        ORDER BY input_embeddings.ordinality
      `,
      [
        params.workspaceId,
        params.projectId,
        params.documentId,
        JSON.stringify(params.embeddings),
      ],
    );

    return rows;
  }

  async deleteDocument(
    workspaceId: string,
    projectId: string,
    documentId: string,
    manager?: EntityManager,
  ): Promise<DeletedDocumentRow | null> {
    const documents = await this.getManager(manager).query<
      DeletedDocumentRow[]
    >(
      `
        WITH deleted_document AS (
          DELETE FROM prism_documents_l
          WHERE workspace_id = $1
            AND project_id = $2
            AND document_id = $3
          RETURNING
            document_id,
            storage_object_name,
            storage_version_id,
            source_comment_id,
            created_by
        )
        SELECT
          document_id AS "documentId",
          storage_object_name AS "storageObjectName",
          storage_version_id AS "storageVersionId",
          source_comment_id AS "sourceCommentId",
          created_by AS "createdBy"
        FROM deleted_document
      `,
      [workspaceId, projectId, documentId],
    );

    return documents[0] ?? null;
  }

  async deleteDocumentsBySourceWorkItemIds(
    workspaceId: string,
    projectId: string,
    itemIds: string[],
    manager?: EntityManager,
  ): Promise<DeletedDocumentRow[]> {
    if (itemIds.length === 0) {
      return [];
    }

    return this.getManager(manager).query<DeletedDocumentRow[]>(
      `
        WITH deleted_documents AS (
          DELETE FROM prism_documents_l
          WHERE workspace_id = $1
            AND project_id = $2
            AND source_kind = 'work_item'
            AND source_work_item_id_snapshot = ANY($3::uuid[])
          RETURNING
            document_id,
            storage_object_name,
            storage_version_id,
            source_comment_id,
            created_by
        )
        SELECT
          document_id AS "documentId",
          storage_object_name AS "storageObjectName",
          storage_version_id AS "storageVersionId",
          source_comment_id AS "sourceCommentId",
          created_by AS "createdBy"
        FROM deleted_documents
      `,
      [workspaceId, projectId, itemIds],
    );
  }

  async workItemExists(
    workspaceId: string,
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const rows = await this.getManager(manager).query<{ exists: boolean }[]>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM prism_work_items_l
          WHERE workspace_id = $1
            AND project_id = $2
            AND item_id = $3
            AND deleted_at IS NULL
        ) AS "exists"
      `,
      [workspaceId, projectId, itemId],
    );

    return rows[0]?.exists ?? false;
  }

  async findWorkItemTitle(
    workspaceId: string,
    projectId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    const rows = await this.getManager(manager).query<Array<{ title: string }>>(
      `
        SELECT title
        FROM prism_work_items_l
        WHERE workspace_id = $1
          AND project_id = $2
          AND item_id = $3
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [workspaceId, projectId, itemId],
    );

    return rows[0]?.title ?? null;
  }

  async commentExistsForWorkItem(
    workspaceId: string,
    projectId: string,
    itemId: string,
    commentId: string,
    authorUserId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const rows = await this.getManager(manager).query<{ exists: boolean }[]>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM prism_work_item_comments_l c
                 INNER JOIN prism_work_items_l wi
                            ON wi.workspace_id = c.workspace_id
                           AND wi.item_id = c.item_id
          WHERE c.workspace_id = $1
            AND wi.project_id = $2
            AND c.item_id = $3
            AND c.comment_id = $4
            AND c.author_user_id = $5
            AND wi.deleted_at IS NULL
        ) AS "exists"
      `,
      [workspaceId, projectId, itemId, commentId, authorUserId],
    );

    return rows[0]?.exists ?? false;
  }

  private mapDocumentRow(row: DocumentDbRow): DocumentRow {
    return {
      ...row,
      sizeBytes: Number(row.sizeBytes),
    };
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
