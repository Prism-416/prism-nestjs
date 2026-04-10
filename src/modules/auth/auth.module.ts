import { Module } from '@nestjs/common';
import { AuthController } from '@/modules/auth/controller';
import { SignUpController } from '@/modules/auth/controller/signup.controller';
import { AuthRepository } from '@/modules/auth/repository';
import {
  AuthRegistrationService,
  EmailVerificationService,
  GithubTokenVerifierService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';
import { AuthUseCase, SignUpUseCase } from '@/modules/auth/usecases';

@Module({
  controllers: [AuthController, SignUpController],
  providers: [
    AuthRepository,
    AuthUseCase,
    SignUpUseCase,
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
