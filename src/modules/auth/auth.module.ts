import { Module } from '@nestjs/common';
import { SignUpController } from '@/modules/auth/controller';
import { AuthRepository } from '@/modules/auth/repository';
import { AuthUseCase } from '@/modules/auth/usecases';

@Module({
  controllers: [SignUpController],
  providers: [AuthRepository, AuthUseCase],
})
export class AuthModule {}
