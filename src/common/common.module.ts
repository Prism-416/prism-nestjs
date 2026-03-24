import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthenticationGuard, JwtTokenService } from '@/common/auth';
import { UnitOfWork } from '@/common/database';
import { OciEmailModule } from '@/common/email';
import { PasswordService } from '@/common/security';

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
export class CommonModule {}
