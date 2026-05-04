import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { OciEmailDeliveryService } from '@/core/email';
import { PasswordService } from '@/core/security';
import { InvalidPasswordResetTokenError } from '@/modules/auth/errors';
import { AuthRepository } from '@/modules/auth/repository';

@Injectable()
export class PasswordResetService {
  static readonly TOKEN_TTL_MINUTES = 10;

  private readonly resetPageUrl =
    process.env.EMAIL_PASSWORD_RESET_PAGE_URL ?? '';

  constructor(
    private readonly repo: AuthRepository,
    private readonly emailDelivery: OciEmailDeliveryService,
    private readonly passwordService: PasswordService,
  ) {}

  async issue(
    email: string,
    authId: string,
    manager: EntityManager,
  ): Promise<void> {
    const token = randomUUID();
    const tokenHash = this.hashPasswordResetToken(token);
    const expiresAt = new Date(
      Date.now() + PasswordResetService.TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.repo.deleteUnusedPasswordResetTokensByAuthId(authId, manager);
    await this.repo.createPasswordResetToken(
      authId,
      tokenHash,
      expiresAt,
      manager,
    );

    const resetLink = this.buildResetLink(token);
    await this.emailDelivery.sendEmail({
      to: [{ email }],
      subject: 'Reset your password',
      bodyText: resetLink
        ? `Reset your password by opening this link: ${resetLink}\n\nThis link expires in ${PasswordResetService.TOKEN_TTL_MINUTES} minutes.`
        : `Your password reset token is ${token}\n\nSend this token to the password reset endpoint. It expires in ${PasswordResetService.TOKEN_TTL_MINUTES} minutes.`,
    });
  }

  async resetPassword(
    tokenPayload: string,
    newPassword: string,
    manager: EntityManager,
  ): Promise<void> {
    const tokenHash = this.hashPasswordResetToken(tokenPayload);
    const token = await this.repo.findValidPasswordResetTokenByHash(
      tokenHash,
      new Date(),
      manager,
    );
    if (!token) {
      throw new InvalidPasswordResetTokenError();
    }

    const auth = await this.repo.findEmailAuthCredentialByAuthId(
      token.authId,
      manager,
    );
    if (!auth) {
      throw new InvalidPasswordResetTokenError();
    }

    const passwordHash = await this.passwordService.hash(newPassword);

    await this.repo.markPasswordResetTokenAsUsed(
      token.passwordResetTokenId,
      manager,
    );
    await this.repo.deleteUnusedPasswordResetTokensByAuthId(
      token.authId,
      manager,
    );
    await this.repo.updateEmailAuthPassword(auth.authId, passwordHash, manager);
    await this.repo.invalidateRefreshTokensByUserId(auth.userId, manager);
  }

  private hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildResetLink(token: string): string {
    if (!this.resetPageUrl) {
      return '';
    }

    const separator = this.resetPageUrl.includes('?') ? '&' : '?';
    return `${this.resetPageUrl}${separator}token=${encodeURIComponent(token)}`;
  }
}
