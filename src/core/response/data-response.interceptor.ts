import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class DataResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: unknown) => {
        if (data === undefined || data === null) {
          return data;
        }
        // Binary file responses must stream through untouched; wrapping a
        // StreamableFile in { data } would JSON-serialize and corrupt it.
        if (data instanceof StreamableFile) {
          return data;
        }
        return { data };
      }),
    );
  }
}
