import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

type GeneratedInternalToken = {
  token: string;
  tokenPrefix: string;
  tokenHash: string;
};

@Injectable()
export class InternalTokenService {
  private readonly tokenPrefixLabel = 'prism_it';
  private readonly tokenHashPrefix = 'sha256:';

  generateToken(): GeneratedInternalToken {
    const tokenPrefix = `${this.tokenPrefixLabel}_${this.randomTokenPart(12)}`;
    const token = `${tokenPrefix}.${this.randomTokenPart(32)}`;

    return {
      token,
      tokenPrefix,
      tokenHash: this.hashToken(token),
    };
  }

  parseTokenPrefix(token: string): string | null {
    const [tokenPrefix, secret, extra] = token.trim().split('.');

    if (
      !tokenPrefix ||
      !secret ||
      extra !== undefined ||
      !tokenPrefix.startsWith(`${this.tokenPrefixLabel}_`)
    ) {
      return null;
    }

    return tokenPrefix;
  }

  verifyToken(token: string, tokenHash: string): boolean {
    const expectedHash = this.hashToken(token);
    const expected = Buffer.from(expectedHash);
    const actual = Buffer.from(tokenHash);

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private hashToken(token: string): string {
    const digest = createHash('sha256').update(token, 'utf8').digest('hex');
    return `${this.tokenHashPrefix}${digest}`;
  }

  private randomTokenPart(byteLength: number): string {
    return randomBytes(byteLength).toString('base64url');
  }
}
