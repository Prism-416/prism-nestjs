import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export type GoogleProfile = {
  subject: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
};

@Injectable()
export class GoogleTokenVerifierService {
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    const audience = this.getAudience();
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Malformed Google ID token payload');
    }

    return this.mapPayload(payload);
  }

  private getAudience(): string[] {
    const rawAudience =
      this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '';
    const audience = rawAudience
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (audience.length === 0) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is not configured',
      );
    }

    return audience;
  }

  private mapPayload(payload: TokenPayload): GoogleProfile {
    return {
      subject: payload.sub,
      email: payload.email ?? '',
      emailVerified: payload.email_verified === true,
      fullName:
        payload.name?.trim() ||
        payload.given_name?.trim() ||
        payload.email?.split('@')[0] ||
        'Google User',
    };
  }
}
