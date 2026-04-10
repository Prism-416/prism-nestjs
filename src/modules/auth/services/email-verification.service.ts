import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { OciEmailDeliveryService } from '@/core/email';
import { InvalidEmailVerificationTokenError } from '@/modules/auth/errors';
import { AuthRepository } from '@/modules/auth/repository';
import { UserProfileRow } from '@/modules/auth/types';

@Injectable()
export class EmailVerificationService {
  static readonly TOKEN_TTL_MINUTES = 10;

  private readonly verificationPageUrl =
    process.env.EMAIL_VERIFICATION_PAGE_URL ?? '';

  constructor(
    private readonly repo: AuthRepository,
    private readonly emailDelivery: OciEmailDeliveryService,
  ) {}

  async issue(
    email: string,
    authId: string,
    manager: EntityManager,
  ): Promise<void> {
    const token = randomUUID();
    const tokenHash = this.hashVerificationToken(token);
    const expiresAt = new Date(
      Date.now() + EmailVerificationService.TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.repo.deleteUnusedEmailTokensByAuthId(authId, manager);
    await this.repo.createEmailVerificationToken(
      authId,
      tokenHash,
      expiresAt,
      manager,
    );

    const verificationLink = this.buildVerificationLink(token);
    await this.emailDelivery.sendEmail({
      to: [{ email }],
      subject: 'Verify your email',
      bodyText: verificationLink
        ? `Verify your email by opening this link: ${verificationLink}\n\nThis link expires in ${EmailVerificationService.TOKEN_TTL_MINUTES} minutes.`
        : `Your email verification token is ${token}\n\nSend this token to the verification endpoint. It expires in ${EmailVerificationService.TOKEN_TTL_MINUTES} minutes.`,
    });
  }

  hashToken(token: string): string {
    return this.hashVerificationToken(token);
  }

  async verifyToken(
    tokenPayload: string,
    manager: EntityManager,
  ): Promise<UserProfileRow> {
    const tokenHash = this.hashVerificationToken(tokenPayload);
    const token = await this.repo.findValidEmailVerificationTokenByHash(
      tokenHash,
      new Date(),
      manager,
    );
    if (!token) {
      throw new InvalidEmailVerificationTokenError();
    }

    const user = await this.repo.findUserByAuthId(token.authId, manager);
    if (!user) {
      throw new InvalidEmailVerificationTokenError();
    }

    await this.repo.markEmailVerificationTokenAsUsed(
      token.emailTokenId,
      manager,
    );
    await this.repo.deleteUnusedEmailTokensByAuthId(token.authId, manager);
    await this.repo.markUserAuthVerified(token.authId, manager);

    return user;
  }

  private hashVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildVerificationLink(token: string): string {
    if (!this.verificationPageUrl) {
      return '';
    }

    const separator = this.verificationPageUrl.includes('?') ? '&' : '?';
    return `${this.verificationPageUrl}${separator}token=${encodeURIComponent(token)}`;
  }
}
