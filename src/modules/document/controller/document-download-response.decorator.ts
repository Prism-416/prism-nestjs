import { ApiOkResponse } from '@nestjs/swagger';

export function ApiDocumentDownloadResponse() {
  return ApiOkResponse({
    description: 'Successfully downloaded document file',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  });
}
