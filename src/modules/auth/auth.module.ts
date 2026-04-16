import { Module } from '@nestjs/common';
import { AuthController } from '@/modules/auth/controller';
import { GitHubOAuthCookieInterceptor } from '@/modules/auth/interceptors';
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
    GitHubOAuthCookieInterceptor,
  ],
  exports: [
    AuthRepository,
    AuthRegistrationService,
    EmailVerificationService,
    GoogleTokenVerifierService,
    GithubTokenVerifierService,
    GitHubOAuthCookieInterceptor,
  ],
})
export class AuthModule {}
