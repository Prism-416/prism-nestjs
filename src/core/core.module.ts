import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthenticationGuard, JwtTokenService } from '@/core/auth';
import { UnitOfWork } from '@/core/database';
import { OciEmailModule } from '@/core/email';
import { PasswordService } from '@/core/security';

@Global()
@Module({
  imports: [JwtModule.register({}), OciEmailModule],
  providers: [
    JwtTokenService,
    JwtAuthenticationGuard,
    PasswordService,
    UnitOfWork,
  ],
  exports: [
    OciEmailModule,
    JwtTokenService,
    JwtAuthenticationGuard,
    PasswordService,
    UnitOfWork,
  ],
})
export class CoreModule {}
