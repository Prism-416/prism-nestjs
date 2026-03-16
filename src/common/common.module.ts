import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthenticationGuard, JwtTokenService } from '@/common/auth';
import { TransactionService } from '@/common/database';
import { PasswordService } from '@/common/security';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    JwtTokenService,
    JwtAuthenticationGuard,
    PasswordService,
    TransactionService,
  ],
  exports: [
    JwtTokenService,
    JwtAuthenticationGuard,
    PasswordService,
    TransactionService,
  ],
})
export class CommonModule {}
