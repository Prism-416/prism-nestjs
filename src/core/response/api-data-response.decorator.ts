import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface ApiDataResponseOptions {
  status?: HttpStatus;
  description?: string;
  isArray?: boolean;
}

export function ApiDataResponse(
  type: Type<unknown>,
  options: ApiDataResponseOptions = {},
) {
  const { status = HttpStatus.OK, description, isArray = false } = options;

  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(type) } }
    : { $ref: getSchemaPath(type) };

  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: { data: dataSchema },
        required: ['data'],
      },
    }),
  );
}
