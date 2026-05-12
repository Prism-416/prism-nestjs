import { Module } from '@nestjs/common';
import { UserPreferenceController } from '@/modules/user/controller';
import { UserPreferenceRepository } from '@/modules/user/repository';
import { UserPreferenceUseCase } from '@/modules/user/usecases';

@Module({
  controllers: [UserPreferenceController],
  providers: [UserPreferenceRepository, UserPreferenceUseCase],
})
export class UserModule {}
