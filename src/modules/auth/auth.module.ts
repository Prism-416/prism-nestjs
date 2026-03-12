import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignUpController } from '@/modules/auth/controller';
import { AuthRepository } from '@/modules/auth/repository';
import { AuthUseCase } from '@/modules/auth/usecases';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [SignUpController],
  providers: [AuthRepository, AuthUseCase],
})
export class AuthModule {}
