import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  AuthTokenCookieInterceptor,
  JwtAuthenticationGuard,
  JwtTokenService,
} from '@/core/auth';
import { UnitOfWork } from '@/core/database';
import { OciEmailModule } from '@/core/email';
import { PasswordService } from '@/core/security';

@Global()
@Module({
  imports: [JwtModule.register({}), OciEmailModule],
  providers: [
    JwtTokenService,
    JwtAuthenticationGuard,
    AuthTokenCookieInterceptor,
    PasswordService,
    UnitOfWork,
  ],
  exports: [
    OciEmailModule,
    JwtTokenService,
    JwtAuthenticationGuard,
    AuthTokenCookieInterceptor,
    PasswordService,
    UnitOfWork,
  ],
})
export class CoreModule {}
