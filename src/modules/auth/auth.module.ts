import { Module } from '@nestjs/common';
import { AuthController } from '@/modules/auth/controller';
import { AuthRepository, SignUpRepository } from '@/modules/auth/repository';
import {
  GithubTokenVerifierService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';
import { AuthUseCase, SignUpUseCase } from '@/modules/auth/usecases';
import { SignUpController } from '@/modules/auth/controller/signup.controller';

@Module({
  controllers: [AuthController, SignUpController],
  providers: [
    AuthRepository,
    AuthUseCase,
    SignUpRepository,
    SignUpUseCase,
    GoogleTokenVerifierService,
    GithubTokenVerifierService,
  ],
})
export class AuthModule {}
