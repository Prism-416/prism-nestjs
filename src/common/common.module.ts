import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthenticationGuard, JwtTokenService } from '@/common/auth';
import { PasswordService } from '@/common/security';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [JwtTokenService, JwtAuthenticationGuard, PasswordService],
  exports: [JwtTokenService, JwtAuthenticationGuard, PasswordService],
})
export class CommonModule {}
