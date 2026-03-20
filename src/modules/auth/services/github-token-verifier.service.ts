import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOAuthUserAuth } from '@octokit/auth-oauth-user';
import { Octokit, RequestError } from 'octokit';
import { GithubProfile } from '@/modules/auth/types';
import { pickDisplayName } from '@/modules/auth/utils';

type GithubUser = {
  id: number;
  login?: string;
  name?: string | null;
};

type GithubEmail = {
  email?: string;
  primary?: boolean;
  verified?: boolean;
};

@Injectable()
export class GithubTokenVerifierService {
  constructor(private readonly configService: ConfigService) {}

  async verify(code: string, redirectUri?: string): Promise<GithubProfile> {
    const octokit = await this.createUserOctokit(code, redirectUri);

    try {
      const [{ data: userData }, { data: emailsData }] = await Promise.all([
        octokit.request('GET /user'),
        octokit.request('GET /user/emails'),
      ]);
      const user = this.parseGithubUser(userData as unknown);
      const emails = this.parseGithubEmails(emailsData as unknown);

      return this.mapProfile(user, emails);
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) {
        throw new UnauthorizedException('Failed to fetch GitHub user profile');
      }

      throw error;
    }
  }

  private async createUserOctokit(
    code: string,
    redirectUri?: string,
  ): Promise<Octokit> {
    const auth = createOAuthUserAuth({
      clientType: 'github-app',
      clientId: this.getRequiredConfig('GITHUB_CLIENT_ID'),
      clientSecret: this.getRequiredConfig('GITHUB_CLIENT_SECRET'),
      code,
      ...(redirectUri ? { redirectUrl: redirectUri } : {}),
    });

    try {
      const authentication = await auth();

      return new Octokit({ auth: authentication.token });
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) {
        throw new UnauthorizedException('Failed to exchange GitHub code');
      }

      throw error;
    }
  }

  private parseGithubUser(data: unknown): GithubUser {
    if (!this.isRecord(data) || typeof data.id !== 'number') {
      throw new UnauthorizedException('Malformed GitHub user profile');
    }

    return {
      id: data.id,
      login: typeof data.login === 'string' ? data.login : undefined,
      name: typeof data.name === 'string' ? data.name : null,
    };
  }

  private parseGithubEmails(data: unknown): GithubEmail[] {
    if (!Array.isArray(data)) {
      throw new UnauthorizedException('Malformed GitHub user emails');
    }

    return data.map((item) => {
      if (!this.isRecord(item)) {
        throw new UnauthorizedException('Malformed GitHub user emails');
      }

      return {
        email: typeof item.email === 'string' ? item.email : undefined,
        primary: item.primary === true,
        verified: item.verified === true,
      };
    });
  }

  private mapProfile(user: GithubUser, emails: GithubEmail[]): GithubProfile {
    const subject = String(user.id);
    const verifiedEmail =
      emails.find((email) => email.primary && email.verified && email.email)
        ?.email ||
      emails.find((email) => email.verified && email.email)?.email ||
      null;

    if (!verifiedEmail) {
      throw new UnauthorizedException('Malformed GitHub user profile');
    }

    return {
      subject,
      email: verifiedEmail,
      emailVerified: true,
      fullName: pickDisplayName(
        'GitHub User',
        user.name,
        user.login,
        verifiedEmail.split('@')[0],
      ),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getRequiredConfig(key: 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET') {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }
}
