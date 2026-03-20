import { Module } from '@nestjs/common';
import { AuthController } from '@/modules/auth/controller';
import { AuthRepository } from '@/modules/auth/repository';
import { GoogleTokenVerifierService } from '@/modules/auth/services';
import { AuthUseCase } from '@/modules/auth/usecases';

@Module({
  controllers: [AuthController],
  providers: [AuthRepository, AuthUseCase, GoogleTokenVerifierService],
})
export class AuthModule {}
