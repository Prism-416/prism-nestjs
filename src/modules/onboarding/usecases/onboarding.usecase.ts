import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
  VerifyEmailResponseDto,
} from '@/modules/auth/dto';
import {
  AuthRegistrationService,
  EmailVerificationService,
} from '@/modules/auth/services';
import { WorkspaceProvisioningService } from '@/modules/workspace/services';
import {
  buildDefaultWorkspaceDescription,
  buildDefaultWorkspaceName,
} from '@/modules/workspace/utils';

@Injectable()
export class OnboardingUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly authRegistration: AuthRegistrationService,
    private readonly emailVerification: EmailVerificationService,
    private readonly workspaceProvisioning: WorkspaceProvisioningService,
  ) {}

  async checkUsername(username: string): Promise<void> {
    return this.uow.run(async (manager) => {
      await this.authRegistration.ensureUsernameAvailable(username, manager);
    });
  }

  async signUpWithEmail(
    dto: SignUpWithEmailDto,
  ): Promise<SignUpWithEmailResponseDto> {
    return this.uow.run(async (manager) => {
      const { user, authId } = await this.authRegistration.registerEmailUser(
        dto,
        manager,
      );

      await this.emailVerification.issue(user.email, authId, manager);

      return user;
    });
  }

  async verifyEmail(tokenPayload: string): Promise<VerifyEmailResponseDto> {
    return this.uow.run(async (manager) => {
      const user = await this.emailVerification.verifyToken(
        tokenPayload,
        manager,
      );
      const workspaceName = buildDefaultWorkspaceName(user.username);

      await this.workspaceProvisioning.ensureOwnedWorkspace(
        {
          ownerId: user.userId,
          name: workspaceName,
          description: buildDefaultWorkspaceDescription(workspaceName),
        },
        manager,
      );

      return { verified: true };
    });
  }
}
