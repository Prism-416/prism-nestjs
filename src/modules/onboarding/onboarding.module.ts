import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkspaceModule } from '@/modules/workspace/workspace.module';
import { SignUpController } from '@/modules/onboarding/controller';
import { OnboardingUseCase } from '@/modules/onboarding/usecases';

@Module({
  imports: [AuthModule, WorkspaceModule],
  controllers: [SignUpController],
  providers: [OnboardingUseCase],
})
export class OnboardingModule {}
