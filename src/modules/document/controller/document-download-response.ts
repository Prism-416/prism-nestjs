import { pipeline } from 'node:stream/promises';
import type { Response } from 'express';
import type { DocumentDownloadResult } from '@/modules/document/types';

export async function sendDocumentDownloadResponse(
  res: Response,
  download: DocumentDownloadResult,
): Promise<void> {
  res.setHeader('Content-Type', download.contentType);
  res.setHeader('Content-Length', String(download.contentLength));
  res.setHeader(
    'Content-Disposition',
    buildAttachmentContentDisposition(download.fileName),
  );

  if (download.eTag) {
    res.setHeader('ETag', download.eTag);
  }

  if (download.lastModified) {
    res.setHeader('Last-Modified', download.lastModified.toUTCString());
  }

  await pipeline(download.body, res);
}

function buildAttachmentContentDisposition(fileName: string): string {
  const fallbackFileName = fileName
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');

  return [
    `attachment; filename="${fallbackFileName}"`,
    `filename*=UTF-8''${encodeContentDispositionFileName(fileName)}`,
  ].join('; ');
}

function encodeContentDispositionFileName(fileName: string): string {
  return encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
