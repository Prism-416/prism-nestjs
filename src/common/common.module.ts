import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthenticationGuard, JwtTokenService } from '@/common/auth';
import { UnitOfWork } from '@/common/database';
import { PasswordService } from '@/common/security';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    JwtTokenService,
    JwtAuthenticationGuard,
    PasswordService,
    UnitOfWork,
  ],
  exports: [
    JwtTokenService,
    JwtAuthenticationGuard,
    PasswordService,
    UnitOfWork,
  ],
})
export class CommonModule {}
