import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { JwtTokenService } from '@/common/auth';
import { UnitOfWork } from '@/common/database';
import { OciEmailDeliveryService } from '@/common/email';
import { PasswordService } from '@/common/security';
import {
  AuthTokenPairResponseDto,
  RequestEmailVerificationDto,
  RequestEmailVerificationResponseDto,
  SignInWithEmailDto,
  SignInWithGithubDto,
  SignInWithGoogleDto,
  SignUpWithEmailDto,
  VerifyEmailDto,
  VerifyEmailResponseDto,
} from '@/modules/auth/dto';
import {
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidEmailVerificationTokenError,
  InvalidGithubAuthorizationCodeError,
  InvalidGoogleIdTokenError,
  InvalidRefreshTokenError,
  UnverifiedGithubEmailError,
  UnverifiedGoogleEmailError,
} from '@/modules/auth/errors';
import { AuthRepository } from '@/modules/auth/repository';
import {
  GithubTokenVerifierService,
  GoogleTokenVerifierService,
} from '@/modules/auth/services';
import { EntityManager } from 'typeorm';
import { GithubProfile, GoogleProfile } from '@/modules/auth/types';
import { buildUsernameSeeds } from '@/modules/auth/utils';

@Injectable()
export class AuthUseCase {
  private static readonly EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 10;
  private readonly verificationPageUrl =
    process.env.EMAIL_VERIFICATION_PAGE_URL ?? '';

  constructor(
    private readonly repo: AuthRepository,
    private readonly uow: UnitOfWork,
    private readonly jwtService: JwtTokenService,
    private readonly pwdService: PasswordService,
    private readonly emailDelivery: OciEmailDeliveryService,
    private readonly google: GoogleTokenVerifierService,
    private readonly github: GithubTokenVerifierService,
  ) {}

  async signUpWithEmail(dto: SignUpWithEmailDto) {
    const passwordHash = await this.pwdService.hash(dto.password);

    return this.uow.run(async (manager) => {
      const existingUser = await this.repo.findUserByEmail(dto.email, manager);
      if (existingUser) {
        throw new EmailAlreadyExistsError();
      }

      const user = await this.repo.createUser(
        {
          email: dto.email,
          fullName: dto.fullName,
          username: dto.username,
        },
        manager,
      );

      const auth = await this.repo.createEmailAuth(
        user.userId,
        dto.email,
        passwordHash,
        manager,
      );
      await this.issueEmailVerification(dto.email, auth.authId, manager);

      return user;
    });
  }

  async signInWithEmail(
    dto: SignInWithEmailDto,
  ): Promise<AuthTokenPairResponseDto> {
    const user = await this.repo.findUserByEmailForSignIn(dto);
    if (!user || !(await this.pwdService.verify(dto.password, user.password))) {
      throw new InvalidCredentialsError();
    }
    if (!user.isVerified) {
      throw new EmailNotVerifiedError();
    }

    return this.uow.run(async (manager) => {
      return this.issueTokenPair(user.userId, user.email, manager);
    });
  }

  async signInWithGoogle(
    dto: SignInWithGoogleDto,
  ): Promise<AuthTokenPairResponseDto> {
    let googleProfile: GoogleProfile;
    try {
      googleProfile = await this.google.verify(dto.idToken);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }

      throw new InvalidGoogleIdTokenError();
    }

    if (!googleProfile.emailVerified) {
      throw new UnverifiedGoogleEmailError();
    }

    return this.uow.run(async (manager) => {
      const linkedUser = await this.repo.findUserByProvider(
        'google',
        googleProfile.subject,
        manager,
      );
      if (linkedUser) {
        return this.issueTokenPair(
          linkedUser.userId,
          linkedUser.email,
          manager,
        );
      }

      let user = await this.repo.findUserByEmail(googleProfile.email, manager);
      if (!user) {
        const username = await this.generateUniqueUsername(
          googleProfile.email,
          googleProfile.fullName,
          manager,
        );
        user = await this.repo.createUser(
          {
            email: googleProfile.email,
            fullName: googleProfile.fullName,
            username,
          },
          manager,
        );
      }

      await this.repo.createOAuthAuth(
        user.userId,
        'google',
        googleProfile.subject,
        googleProfile.email,
        manager,
      );

      return this.issueTokenPair(user.userId, user.email, manager);
    });
  }

  async signInWithGithub(
    dto: SignInWithGithubDto,
  ): Promise<AuthTokenPairResponseDto> {
    let githubProfile: GithubProfile;
    try {
      githubProfile = await this.github.verify(dto.code, dto.redirectUri);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }

      throw new InvalidGithubAuthorizationCodeError();
    }

    if (!githubProfile.emailVerified) {
      throw new UnverifiedGithubEmailError();
    }

    return this.uow.run(async (manager) => {
      const linkedUser = await this.repo.findUserByProvider(
        'github',
        githubProfile.subject,
        manager,
      );
      if (linkedUser) {
        return this.issueTokenPair(
          linkedUser.userId,
          linkedUser.email,
          manager,
        );
      }

      let user = await this.repo.findUserByEmail(githubProfile.email, manager);
      if (!user) {
        const username = await this.generateUniqueUsername(
          githubProfile.email,
          githubProfile.fullName,
          manager,
        );
        user = await this.repo.createUser(
          {
            email: githubProfile.email,
            fullName: githubProfile.fullName,
            username,
          },
          manager,
        );
      }

      await this.repo.createOAuthAuth(
        user.userId,
        'github',
        githubProfile.subject,
        githubProfile.email,
        manager,
      );

      return this.issueTokenPair(user.userId, user.email, manager);
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokenPairResponseDto> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const userId = String(payload.sub);

    return this.uow.run(async (manager) => {
      const user = await this.repo.findUserById(userId, manager);
      if (!user) {
        throw new InvalidRefreshTokenError();
      }

      const storedRefreshToken = await this.repo.findValidRefreshTokenByUserId(
        userId,
        new Date(),
        manager,
      );
      if (
        !storedRefreshToken ||
        !(await this.pwdService.verify(
          refreshToken,
          storedRefreshToken.refreshTokenHash,
        ))
      ) {
        throw new InvalidRefreshTokenError();
      }

      await this.repo.invalidateRefreshToken(
        storedRefreshToken.refreshTokenId,
        manager,
      );

      return this.issueTokenPair(user.userId, user.email, manager);
    });
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const userId = String(payload.sub);

    await this.uow.run(async (manager) => {
      await this.repo.invalidateRefreshTokensByUserId(userId, manager);
    });
  }

  async requestEmailVerification(
    dto: RequestEmailVerificationDto,
  ): Promise<RequestEmailVerificationResponseDto> {
    await this.uow.run(async (manager) => {
      const auth = await this.repo.findEmailAuthByEmail(dto.email, manager);
      if (!auth) {
        return;
      }

      await this.issueEmailVerification(dto.email, auth.authId, manager);
    });

    return { requested: true };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    return this.uow.run(async (manager) => {
      const tokenHash = this.hashVerificationToken(dto.token);
      const token = await this.repo.findValidEmailVerificationTokenByHash(
        tokenHash,
        new Date(),
        manager,
      );
      if (!token) {
        throw new InvalidEmailVerificationTokenError();
      }

      await this.repo.markEmailVerificationTokenAsUsed(
        token.emailTokenId,
        manager,
      );
      await this.repo.deleteUnusedEmailTokensByAuthId(token.authId, manager);

      return { verified: true };
    });
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    manager: EntityManager,
  ): Promise<AuthTokenPairResponseDto> {
    const accessToken = this.jwtService.createAccessToken(userId, { email });
    const refreshToken = this.jwtService.createRefreshToken(userId, { email });
    const refreshTokenHash = await this.pwdService.hash(refreshToken);
    const refreshPayload = this.jwtService.verifyRefreshToken(refreshToken);

    await this.repo.invalidateRefreshTokensByUserId(userId, manager);
    await this.repo.createRefreshToken(
      userId,
      refreshTokenHash,
      new Date(refreshPayload.exp * 1000),
      manager,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateUniqueUsername(
    email: string,
    fullName: string,
    manager: EntityManager,
  ): Promise<string> {
    const seeds = buildUsernameSeeds(fullName, email);

    for (const seed of seeds) {
      const existingUser = await this.repo.findUserByUsername(seed, manager);
      if (!existingUser) {
        return seed;
      }
    }

    const base = seeds[0] ?? 'user';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${base}${randomInt(1000, 9999)}`.slice(0, 30);
      const existingUser = await this.repo.findUserByUsername(
        candidate,
        manager,
      );
      if (!existingUser) {
        return candidate;
      }
    }

    return `user${Date.now().toString().slice(-8)}`.slice(0, 30);
  }

  private async issueEmailVerification(
    email: string,
    authId: string,
    manager: EntityManager,
  ): Promise<void> {
    const token = randomUUID();
    const tokenHash = this.hashVerificationToken(token);
    const expiresAt = new Date(
      Date.now() + AuthUseCase.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000,
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
        ? `Verify your email by opening this link: ${verificationLink}\n\nThis link expires in ${AuthUseCase.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES} minutes.`
        : `Your email verification token is ${token}\n\nSend this token to the verification endpoint. It expires in ${AuthUseCase.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES} minutes.`,
    });
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
