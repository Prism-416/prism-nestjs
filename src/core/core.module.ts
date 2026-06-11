import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  AuthTokenCookieInterceptor,
  JwtAuthenticationGuard,
  JwtTokenService,
  LastActiveService,
  RefreshTokenCookieInterceptor,
} from '@/core/auth';
import { UnitOfWork } from '@/core/database';
import { OciEmailModule } from '@/core/email';
import { OciObjectStorageModule } from '@/core/object-storage';
import { OciQueueModule } from '@/core/queue';
import { PasswordService } from '@/core/security';
import {
  WebSocketAuthService,
  WebSocketExceptionFilter,
} from '@/core/websocket';

@Global()
@Module({
  imports: [
    JwtModule.register({}),
    OciEmailModule,
    OciQueueModule,
    OciObjectStorageModule,
  ],
  providers: [
    JwtTokenService,
    JwtAuthenticationGuard,
    AuthTokenCookieInterceptor,
    RefreshTokenCookieInterceptor,
    LastActiveService,
    PasswordService,
    UnitOfWork,
    WebSocketAuthService,
    WebSocketExceptionFilter,
  ],
  exports: [
    OciEmailModule,
    OciQueueModule,
    OciObjectStorageModule,
    JwtTokenService,
    JwtAuthenticationGuard,
    AuthTokenCookieInterceptor,
    RefreshTokenCookieInterceptor,
    LastActiveService,
    PasswordService,
    UnitOfWork,
    WebSocketAuthService,
    WebSocketExceptionFilter,
  ],
})
export class CoreModule {}
