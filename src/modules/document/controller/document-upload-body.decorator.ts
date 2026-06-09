import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export function ApiDocumentUploadBody() {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
          },
          title: {
            type: 'string',
            maxLength: 100,
          },
          description: {
            type: 'string',
            maxLength: 1000,
          },
          workItemId: {
            type: 'string',
            format: 'uuid',
            description:
              'Work item to associate the document with (set when sharing from a work item).',
          },
          commentId: {
            type: 'string',
            format: 'uuid',
            description:
              'Comment the document is shared in (requires workItemId).',
          },
        },
      },
    }),
  );
}
