import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import { RefreshTokenResponseDto } from '@/modules/auth/dto';
import { AuthRegistrationService } from '@/modules/auth/services/auth-registration.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import { AuthProvider } from '@/modules/auth/types';
import { WorkspaceProvisioningService } from '@/modules/workspace/services';

@Injectable()
export class OAuthRegistrationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly authRegistration: AuthRegistrationService,
    private readonly authSession: AuthSessionService,
    private readonly workspaceProvisioning: WorkspaceProvisioningService,
  ) {}

  async registerAndIssueRefreshToken(params: {
    provider: Exclude<AuthProvider, 'email'>;
    providerUserId: string;
    email: string;
    fullName: string;
    usernameSeeds: string[];
  }): Promise<RefreshTokenResponseDto> {
    return await this.uow.run(async (manager) => {
      const username = await this.authRegistration.resolveAvailableUsername(
        params.usernameSeeds,
        manager,
      );
      const user = await this.authRegistration.registerOAuthUser(
        {
          provider: params.provider,
          providerUserId: params.providerUserId,
          email: params.email,
          fullName: params.fullName,
          username,
        },
        manager,
      );

      await this.workspaceProvisioning.createOwnedWorkspace(
        {
          ownerId: user.userId,
          name: this.buildDefaultWorkspaceName(user.username),
        },
        manager,
      );

      return await this.authSession.issueRefreshToken(
        user.userId,
        user.email,
        manager,
      );
    });
  }

  private buildDefaultWorkspaceName(username: string): string {
    return `${username}'s workspace`;
  }
}
