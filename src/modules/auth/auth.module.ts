import { Module } from '@nestjs/common';
import { AuthController } from '@/modules/auth/controller';
import {
  GitHubOAuthCallbackInterceptor,
  GitHubOAuthCookieInterceptor,
} from '@/modules/auth/interceptors';
import { AuthRepository } from '@/modules/auth/repository';
import {
  AuthRegistrationService,
  AuthSessionService,
  EmailVerificationService,
  GithubTokenVerifierService,
  OAuthIdentityService,
  OAuthRegistrationService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';
import {
  AuthUseCase,
  GithubOAuthCallbackUseCase,
} from '@/modules/auth/usecases';
import { WorkspaceModule } from '@/modules/workspace/workspace.module';

@Module({
  imports: [WorkspaceModule],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthUseCase,
    GithubOAuthCallbackUseCase,
    AuthRegistrationService,
    AuthSessionService,
    EmailVerificationService,
    GoogleTokenVerifierService,
    GithubTokenVerifierService,
    OAuthIdentityService,
    OAuthRegistrationService,
    GitHubOAuthCookieInterceptor,
    GitHubOAuthCallbackInterceptor,
  ],
  exports: [
    AuthRepository,
    AuthRegistrationService,
    AuthSessionService,
    EmailVerificationService,
    GoogleTokenVerifierService,
    GithubTokenVerifierService,
    OAuthIdentityService,
    OAuthRegistrationService,
    GitHubOAuthCookieInterceptor,
    GitHubOAuthCallbackInterceptor,
  ],
})
export class AuthModule {}
