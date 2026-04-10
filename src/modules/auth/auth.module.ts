import { Module } from '@nestjs/common';
import { AuthController } from '@/modules/auth/controller';
import { AuthRepository } from '@/modules/auth/repository';
import {
  AuthRegistrationService,
  EmailVerificationService,
  GithubTokenVerifierService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';
import { AuthUseCase } from '@/modules/auth/usecases';

@Module({
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthUseCase,
    AuthRegistrationService,
    EmailVerificationService,
    GoogleTokenVerifierService,
    GithubTokenVerifierService,
  ],
  exports: [
    AuthRepository,
    AuthRegistrationService,
    EmailVerificationService,
    GoogleTokenVerifierService,
    GithubTokenVerifierService,
  ],
})
export class AuthModule {}
