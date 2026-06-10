import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { DataResponseInterceptor } from '@/core/response';

describe('DataResponseInterceptor', () => {
  it('wraps success responses in a top-level data object', async () => {
    const interceptor = new DataResponseInterceptor();
    const context = {
      getType: () => 'http',
    } as unknown as ExecutionContext;
    const next = {
      handle: () => of({ reviewId: '1', url: 'https://github.com/review/1' }),
    } as CallHandler;

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({
      data: { reviewId: '1', url: 'https://github.com/review/1' },
    });
  });
});
