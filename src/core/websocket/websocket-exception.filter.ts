import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { DomainError } from '@/core/errors';
import type { AuthenticatedSocket } from '@/core/websocket/websocket.types';

export const WEBSOCKET_EXCEPTION_EVENT = 'exception';

export type WebSocketErrorPayload = {
  code: string;
  message: string;
};

@Catch()
@Injectable()
export class WebSocketExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<AuthenticatedSocket>();
    this.emitException(client, exception);
  }

  emitException(
    client: AuthenticatedSocket,
    exception: unknown,
    disconnect = false,
  ): void {
    client.emit(WEBSOCKET_EXCEPTION_EVENT, this.toPayload(exception));

    if (disconnect) {
      client.disconnect(true);
    }
  }

  private toPayload(exception: unknown): WebSocketErrorPayload {
    if (exception instanceof DomainError) {
      return {
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      return {
        code: `WEBSOCKET_${exception.getStatus()}`,
        message: exception.message,
      };
    }

    return {
      code: 'WEBSOCKET_ERROR',
      message: 'Websocket request failed.',
    };
  }
}
