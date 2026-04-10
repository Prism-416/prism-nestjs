import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PasswordService } from '@/core/security';
import {
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
} from '@/modules/auth/errors';
import { AuthProvider, CreatedUserRow } from '@/modules/auth/types';
import { AuthRepository } from '@/modules/auth/repository';

@Injectable()
export class AuthRegistrationService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async ensureUsernameAvailable(
    username: string,
    manager: EntityManager,
  ): Promise<void> {
    const user = await this.repo.findUserByUsername(username, manager);
    if (user) {
      throw new UsernameAlreadyExistsError();
    }
  }

  async registerEmailUser(
    params: {
      email: string;
      password: string;
      fullName: string;
      username: string;
    },
    manager: EntityManager,
  ): Promise<{ user: CreatedUserRow; authId: string }> {
    const existingUser = await this.repo.findUserByEmail(params.email, manager);
    if (existingUser) {
      throw new EmailAlreadyExistsError();
    }

    await this.ensureUsernameAvailable(params.username, manager);

    const passwordHash = await this.passwordService.hash(params.password);
    const user = await this.repo.createUser(
      {
        email: params.email,
        fullName: params.fullName,
        username: params.username,
      },
      manager,
    );
    const auth = await this.repo.createEmailAuth(
      user.userId,
      params.email,
      passwordHash,
      manager,
    );

    return {
      user,
      authId: auth.authId,
    };
  }

  async registerOAuthUser(
    params: {
      provider: Exclude<AuthProvider, 'email'>;
      providerUserId: string;
      email: string;
      fullName: string;
      username: string;
    },
    manager: EntityManager,
  ): Promise<CreatedUserRow> {
    const linkedUser = await this.repo.findUserByProvider(
      params.provider,
      params.providerUserId,
      manager,
    );
    if (linkedUser) {
      throw new EmailAlreadyExistsError();
    }

    const existingUser = await this.repo.findUserByEmail(params.email, manager);
    if (existingUser) {
      throw new EmailAlreadyExistsError();
    }

    await this.ensureUsernameAvailable(params.username, manager);

    const user = await this.repo.createUser(
      {
        email: params.email,
        fullName: params.fullName,
        username: params.username,
      },
      manager,
    );
    const auth = await this.repo.createOAuthAuth(
      user.userId,
      params.provider,
      params.providerUserId,
      params.email,
      manager,
    );

    await this.repo.markUserAuthVerified(auth.authId, manager);

    return user;
  }
}
