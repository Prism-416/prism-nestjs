import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  AuthTokenPairResponseDto,
  RefreshTokenResponseDto,
} from '@/modules/auth/dto';
import { AuthRepository } from '@/modules/auth/repository';
import { AuthRegistrationService } from '@/modules/auth/services/auth-registration.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import { AuthProvider } from '@/modules/auth/types';
import { WorkspaceProvisioningService } from '@/modules/workspace/services';
import {
  buildDefaultWorkspaceDescription,
  buildDefaultWorkspaceName,
} from '@/modules/workspace/utils';
import { EntityManager } from 'typeorm';

@Injectable()
export class OAuthRegistrationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly repo: AuthRepository,
    private readonly authRegistration: AuthRegistrationService,
    private readonly authSession: AuthSessionService,
    private readonly workspaceProvisioning: WorkspaceProvisioningService,
  ) {}

  async signInOrRegisterAndIssueTokenPair(params: {
    provider: Exclude<AuthProvider, 'email'>;
    providerUserId: string;
    email: string;
    fullName: string;
    usernameSeeds: string[];
  }): Promise<AuthTokenPairResponseDto> {
    return await this.uow.run(async (manager) => {
      const linkedUser = await this.repo.findUserByProvider(
        params.provider,
        params.providerUserId,
        manager,
      );

      if (linkedUser) {
        return await this.authSession.issueTokenPair(
          linkedUser.userId,
          linkedUser.email,
          manager,
        );
      }

      const user = await this.registerOAuthUser(params, manager);

      return await this.authSession.issueTokenPair(
        user.userId,
        user.email,
        manager,
      );
    });
  }

  async registerAndIssueRefreshToken(params: {
    provider: Exclude<AuthProvider, 'email'>;
    providerUserId: string;
    email: string;
    fullName: string;
    usernameSeeds: string[];
  }): Promise<RefreshTokenResponseDto> {
    return await this.uow.run(async (manager) => {
      const user = await this.registerOAuthUser(params, manager);

      return await this.authSession.issueRefreshToken(
        user.userId,
        user.email,
        manager,
      );
    });
  }

  private async registerOAuthUser(
    params: {
      provider: Exclude<AuthProvider, 'email'>;
      providerUserId: string;
      email: string;
      fullName: string;
      usernameSeeds: string[];
    },
    manager: EntityManager,
  ) {
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

    const workspaceName = buildDefaultWorkspaceName(user.username);

    await this.workspaceProvisioning.createOwnedWorkspace(
      {
        ownerId: user.userId,
        name: workspaceName,
        description: buildDefaultWorkspaceDescription(workspaceName),
      },
      manager,
    );

    return user;
  }
}
