import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '@/common/errors/domain-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = String(response.getHeader('x-request-id') ?? '');

    if (exception instanceof DomainError) {
      response.status(exception.statusCode).json({
        message: exception.message,
        code: exception.code,
        requestId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      response.status(status).json({
        ...(typeof res === 'string' ? { message: res } : res),
        requestId,
      });
      return;
    }

    this.logger.error(
      `Unhandled error on ${request.method} ${request.url} [${requestId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Internal Server Error',
      requestId,
    });
  }
}
