import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export type JwtTokenType = 'access' | 'refresh';

export type JwtPayload = Record<string, unknown> & {
  sub: string;
  iat: number;
  exp: number;
  type: JwtTokenType;
};

type SignPayload = Record<string, unknown> & {
  sub: string;
  type: JwtTokenType;
};

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(
    subject: string,
    claims: Record<string, unknown> = {},
  ): string {
    return this.jwtService.sign(this.buildPayload(subject, 'access', claims), {
      secret: this.getAccessSecret(),
      expiresIn: this.configService.get<number>(
        'JWT_ACCESS_EXPIRES_IN_SEC',
        900,
      ),
    });
  }

  createRefreshToken(
    subject: string,
    claims: Record<string, unknown> = {},
  ): string {
    return this.jwtService.sign(this.buildPayload(subject, 'refresh', claims), {
      secret: this.getRefreshSecret(),
      expiresIn: this.configService.get<number>(
        'JWT_REFRESH_EXPIRES_IN_SEC',
        1209600,
      ),
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.verifyToken(token, this.getAccessSecret(), 'access');
  }

  verifyRefreshToken(token: string): JwtPayload {
    return this.verifyToken(token, this.getRefreshSecret(), 'refresh');
  }

  private verifyToken(
    token: string,
    secret: string,
    expectedType: JwtTokenType,
  ): JwtPayload {
    const payload = this.verifyJwt(token, secret);

    if (payload.type !== expectedType) {
      throw new UnauthorizedException('Invalid token type');
    }
    if (!payload.sub) {
      throw new UnauthorizedException('Malformed JWT payload');
    }

    return payload;
  }

  private verifyJwt(token: string, secret: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired JWT');
    }
  }

  private buildPayload(
    subject: string,
    type: JwtTokenType,
    claims: Record<string, unknown>,
  ): SignPayload {
    return {
      ...claims,
      sub: subject,
      type,
    };
  }

  private getAccessSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT secret is not configured');
    }
    return secret;
  }

  private getRefreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.getAccessSecret()
    );
  }
}
