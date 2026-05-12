import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  CreateDocumentParams,
  DocumentDownloadRow,
  DocumentProjectRow,
  DocumentRow,
  SearchDocumentsParams,
  SearchDocumentsResult,
} from '@/modules/document/types';

type DocumentDbRow = Omit<DocumentRow, 'sizeBytes'> & {
  sizeBytes: string | number;
};

type DocumentDownloadDbRow = Omit<DocumentDownloadRow, 'sizeBytes'> & {
  sizeBytes: string | number;
};

@Injectable()
export class DocumentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findProjectByIdAndMemberUserId(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<DocumentProjectRow | null> {
    const projects = await this.getManager(manager).query<DocumentProjectRow[]>(
      `
        SELECT
          p.project_id AS "projectId"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [projectId, userId],
    );

    return projects[0] ?? null;
  }

  async searchDocuments(
    params: SearchDocumentsParams,
    manager?: EntityManager,
  ): Promise<SearchDocumentsResult> {
    type SearchDocumentDbRow = {
      documentId: string | null;
      projectId: string | null;
      title: string | null;
      description: string | null;
      fileName: string | null;
      contentType: string | null;
      sizeBytes: string | number | null;
      storageETag: string | null;
      storageVersionId: string | null;
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
            d.project_id,
            d.title,
            d.description,
            d.file_name,
            d.content_type,
            d.size_bytes,
            d.storage_etag,
            d.storage_version_id,
            d.created_by,
            d.updated_by,
            d.created_at,
            d.updated_at
          FROM prism_documents_l d
          WHERE d.project_id = $1
            AND (
              $2::text IS NULL
              OR d.title ILIKE '%' || $2 || '%'
              OR d.file_name ILIKE '%' || $2 || '%'
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
          LIMIT $3
          OFFSET $4
        )
        SELECT
          pd.document_id AS "documentId",
          pd.project_id AS "projectId",
          pd.title,
          pd.description,
          pd.file_name AS "fileName",
          pd.content_type AS "contentType",
          pd.size_bytes AS "sizeBytes",
          pd.storage_etag AS "storageETag",
          pd.storage_version_id AS "storageVersionId",
          pd.created_by AS "createdBy",
          pd.updated_by AS "updatedBy",
          pd.created_at AS "createdAt",
          pd.updated_at AS "updatedAt",
          tc.total
        FROM total_count tc
               LEFT JOIN paged_documents pd
                         ON TRUE
        ORDER BY pd.created_at DESC NULLS LAST,
                 pd.document_id DESC NULLS LAST
      `,
      [params.projectId, params.query ?? null, params.limit, params.offset],
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
            projectId: row.projectId as string,
            title: row.title as string,
            description: row.description,
            fileName: row.fileName as string,
            contentType: row.contentType as string,
            sizeBytes: row.sizeBytes as string | number,
            storageETag: row.storageETag,
            storageVersionId: row.storageVersionId,
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

  async findDocumentById(
    projectId: string,
    documentId: string,
    manager?: EntityManager,
  ): Promise<DocumentRow | null> {
    const documents = await this.getManager(manager).query<DocumentDbRow[]>(
      `
        SELECT
          document_id AS "documentId",
          project_id AS "projectId",
          title,
          description,
          file_name AS "fileName",
          content_type AS "contentType",
          size_bytes AS "sizeBytes",
          storage_etag AS "storageETag",
          storage_version_id AS "storageVersionId",
          created_by AS "createdBy",
          updated_by AS "updatedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM prism_documents_l
        WHERE project_id = $1
          AND document_id = $2
        LIMIT 1
      `,
      [projectId, documentId],
    );

    return documents[0] ? this.mapDocumentRow(documents[0]) : null;
  }

  async findDocumentDownloadById(
    projectId: string,
    documentId: string,
    manager?: EntityManager,
  ): Promise<DocumentDownloadRow | null> {
    const documents = await this.getManager(manager).query<
      DocumentDownloadDbRow[]
    >(
      `
        SELECT
          file_name AS "fileName",
          content_type AS "contentType",
          size_bytes AS "sizeBytes",
          storage_object_name AS "storageObjectName",
          storage_etag AS "storageETag",
          storage_version_id AS "storageVersionId"
        FROM prism_documents_l
        WHERE project_id = $1
          AND document_id = $2
        LIMIT 1
      `,
      [projectId, documentId],
    );

    return documents[0] ? this.mapDocumentDownloadRow(documents[0]) : null;
  }

  async createDocument(
    params: CreateDocumentParams,
    manager?: EntityManager,
  ): Promise<DocumentRow> {
    const documents = await this.getManager(manager).query<DocumentDbRow[]>(
      `
        INSERT INTO prism_documents_l (
          document_id,
          project_id,
          title,
          description,
          file_name,
          content_type,
          size_bytes,
          storage_object_name,
          storage_etag,
          storage_version_id,
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
          $11
        )
        RETURNING
          document_id AS "documentId",
          project_id AS "projectId",
          title,
          description,
          file_name AS "fileName",
          content_type AS "contentType",
          size_bytes AS "sizeBytes",
          storage_etag AS "storageETag",
          storage_version_id AS "storageVersionId",
          created_by AS "createdBy",
          updated_by AS "updatedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        params.documentId,
        params.projectId,
        params.title,
        params.description ?? null,
        params.fileName,
        params.contentType,
        params.sizeBytes,
        params.storageObjectName,
        params.storageETag ?? null,
        params.storageVersionId ?? null,
        params.createdBy,
      ],
    );

    return this.mapDocumentRow(documents[0]);
  }

  private mapDocumentRow(row: DocumentDbRow): DocumentRow {
    return {
      ...row,
      sizeBytes: Number(row.sizeBytes),
    };
  }

  private mapDocumentDownloadRow(
    row: DocumentDownloadDbRow,
  ): DocumentDownloadRow {
    return {
      ...row,
      sizeBytes: Number(row.sizeBytes),
    };
  }

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
