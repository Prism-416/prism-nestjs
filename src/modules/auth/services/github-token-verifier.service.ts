import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { CookieOptions } from 'express';
import { Octokit, RequestError } from 'octokit';
import { GITHUB_OAUTH_TRANSACTION_COOKIE } from '@/modules/auth/constants';
import { InvalidGithubOAuthStateError } from '@/modules/auth/errors';
import { GithubProfile } from '@/modules/auth/types';
import { pickDisplayName } from '@/modules/auth/utils';

const GITHUB_AUTHORIZATION_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEFAULT_GITHUB_OAUTH_STATE_TTL_SEC = 600;
const GITHUB_REQUIRED_SCOPE = 'user';

type GithubUser = {
  id: number;
  login?: string;
  name?: string | null;
  avatar_url?: string;
};

type GithubEmail = {
  email?: string;
  primary?: boolean;
  verified?: boolean;
};

type GithubOAuthTransactionPayload = {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  appRedirectUrl: string;
  expiresAt: number;
};

type GithubTokenExchangeResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
  error_uri?: string;
};

type GithubVerifyParams = {
  code: string;
  state: string;
  transaction?: string;
  cookieHeader?: string;
};

export type GithubAuthorizationRequestResult = {
  authorizationUrl: string;
  state: string;
  expiresAt: Date;
  transactionCookie: {
    name: string;
    value: string;
    options: CookieOptions;
  };
};

export type GithubOAuthCallbackContext = {
  appRedirectUrl: string;
};

@Injectable()
export class GithubTokenVerifierService {
  constructor(private readonly configService: ConfigService) {}

  createAuthorizationRequest(params: {
    appRedirectUrl: string;
  }): GithubAuthorizationRequestResult {
    const transaction = this.createOAuthTransaction(params);
    const signedTransaction = this.signOAuthTransaction(transaction);
    const maxAgeMs = Math.max(transaction.expiresAt - Date.now(), 1000);

    return {
      authorizationUrl: this.buildAuthorizationUrl(
        transaction,
        signedTransaction,
      ),
      state: signedTransaction,
      expiresAt: new Date(transaction.expiresAt),
      transactionCookie: {
        name: GITHUB_OAUTH_TRANSACTION_COOKIE,
        value: signedTransaction,
        options: this.buildCookieOptions(maxAgeMs),
      },
    };
  }

  readCallbackContext(params: {
    state: string;
    cookieHeader?: string;
  }): GithubOAuthCallbackContext {
    const transaction = this.validateOAuthTransaction(params);

    return {
      appRedirectUrl: transaction.appRedirectUrl,
    };
  }

  async verify({
    code,
    state,
    transaction: signedTransaction,
    cookieHeader,
  }: GithubVerifyParams): Promise<GithubProfile> {
    const transaction = this.validateOAuthTransaction({
      state,
      signedTransaction,
      cookieHeader,
    });

    return await this.verifyTransactionCode(code, transaction);
  }

  private async verifyTransactionCode(
    code: string,
    transaction: GithubOAuthTransactionPayload,
  ): Promise<GithubProfile> {
    const accessToken = await this.exchangeCodeForUserAccessToken(
      code,
      transaction,
    );

    return await this.fetchGithubProfile(accessToken);
  }

  private async fetchGithubProfile(
    accessToken: string,
  ): Promise<GithubProfile> {
    const octokit = new Octokit({ auth: accessToken });

    try {
      const [{ data: userData }, { data: emailsData }] = await Promise.all([
        octokit.request('GET /user'),
        octokit.request('GET /user/emails'),
      ]);
      const user = this.parseGithubUser(userData as unknown);
      const emails = this.parseGithubEmails(emailsData as unknown);

      return this.mapProfile(user, emails);
    } catch (error) {
      if (
        error instanceof RequestError &&
        [401, 403, 404].includes(error.status)
      ) {
        throw new UnauthorizedException(
          this.buildGithubRequestFailureMessage(
            'Failed to fetch GitHub user profile',
            error,
          ),
        );
      }

      throw error;
    }
  }

  private buildAuthorizationUrl(
    transaction: GithubOAuthTransactionPayload,
    signedTransaction: string,
  ): string {
    const url = new URL(GITHUB_AUTHORIZATION_URL);

    url.searchParams.set(
      'client_id',
      this.getRequiredConfig('GITHUB_CLIENT_ID'),
    );
    url.searchParams.set('state', signedTransaction);
    url.searchParams.set(
      'code_challenge',
      this.createCodeChallenge(transaction.codeVerifier),
    );
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('redirect_uri', transaction.redirectUri);
    url.searchParams.set('scope', GITHUB_REQUIRED_SCOPE);

    if (this.configService.get('NODE_ENV') !== 'production') {
      url.searchParams.set('prompt', 'select_account');
    }

    return url.toString();
  }

  private createOAuthTransaction(params: {
    appRedirectUrl: string;
  }): GithubOAuthTransactionPayload {
    const expiresAt = Date.now() + this.getStateTtlSec() * 1000;

    return {
      state: randomBytes(16).toString('hex'),
      codeVerifier: randomBytes(32).toString('base64url'),
      redirectUri: this.getRequiredUrlConfig('GITHUB_OAUTH_CALLBACK_URL'),
      appRedirectUrl: this.normalizeUrl(
        params.appRedirectUrl,
        'appRedirectUrl',
      ),
      expiresAt,
    };
  }

  private signOAuthTransaction(
    transaction: GithubOAuthTransactionPayload,
  ): string {
    const payload = Buffer.from(JSON.stringify(transaction)).toString(
      'base64url',
    );
    const signature = createHmac('sha256', this.getSigningSecret())
      .update(payload)
      .digest('base64url');

    return `${payload}.${signature}`;
  }

  private validateOAuthTransaction(params: {
    state: string;
    signedTransaction?: string;
    cookieHeader?: string;
  }): GithubOAuthTransactionPayload {
    const cookieValue = this.parseCookies(params.cookieHeader)[
      GITHUB_OAUTH_TRANSACTION_COOKIE
    ];
    const candidates = [
      params.signedTransaction,
      cookieValue,
      params.state,
    ].filter((value): value is string => Boolean(value));

    for (const candidate of new Set(candidates)) {
      const transaction = this.tryReadSignedOAuthTransaction(candidate);
      if (!transaction) {
        continue;
      }

      if (transaction.expiresAt <= Date.now()) {
        continue;
      }

      if (candidate !== params.state && transaction.state !== params.state) {
        continue;
      }

      return transaction;
    }

    throw new InvalidGithubOAuthStateError();
  }

  private tryReadSignedOAuthTransaction(
    cookieValue: string,
  ): GithubOAuthTransactionPayload | null {
    try {
      return this.readSignedOAuthTransaction(cookieValue);
    } catch {
      return null;
    }
  }

  private readSignedOAuthTransaction(
    cookieValue: string,
  ): GithubOAuthTransactionPayload {
    const parsed = this.readSignedPayload(cookieValue);

    if (
      !this.isRecord(parsed) ||
      typeof parsed.state !== 'string' ||
      typeof parsed.codeVerifier !== 'string' ||
      typeof parsed.redirectUri !== 'string' ||
      typeof parsed.appRedirectUrl !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      throw new InvalidGithubOAuthStateError();
    }

    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      redirectUri: parsed.redirectUri,
      appRedirectUrl: parsed.appRedirectUrl,
      expiresAt: parsed.expiresAt,
    };
  }

  private readSignedPayload(cookieValue: string): unknown {
    const separatorIndex = cookieValue.lastIndexOf('.');
    if (separatorIndex <= 0) {
      throw new InvalidGithubOAuthStateError();
    }

    const payload = cookieValue.slice(0, separatorIndex);
    const signature = cookieValue.slice(separatorIndex + 1);
    const expectedSignature = createHmac('sha256', this.getSigningSecret())
      .update(payload)
      .digest('base64url');

    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(signature);

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new InvalidGithubOAuthStateError();
    }

    try {
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw new InvalidGithubOAuthStateError();
    }
  }

  private async exchangeCodeForUserAccessToken(
    code: string,
    transaction: GithubOAuthTransactionPayload,
  ): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.getRequiredConfig('GITHUB_CLIENT_ID'),
      client_secret: this.getRequiredConfig('GITHUB_CLIENT_SECRET'),
      code,
      code_verifier: transaction.codeVerifier,
    });

    body.set('redirect_uri', transaction.redirectUri);

    let response: Response;
    try {
      response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
    } catch {
      throw new InternalServerErrorException(
        'Failed to reach GitHub token endpoint',
      );
    }

    let payload: GithubTokenExchangeResponse;
    try {
      payload = (await response.json()) as GithubTokenExchangeResponse;
    } catch {
      throw new InternalServerErrorException('Malformed GitHub token response');
    }

    if (!response.ok) {
      if (response.status >= 500) {
        throw new InternalServerErrorException(
          'Failed to exchange GitHub code',
        );
      }

      throw new UnauthorizedException('Failed to exchange GitHub code');
    }

    if (payload.error || !payload.access_token) {
      throw new UnauthorizedException(
        payload.error_description ?? 'Failed to exchange GitHub code',
      );
    }

    return payload.access_token;
  }

  private parseGithubUser(data: unknown): GithubUser {
    if (!this.isRecord(data) || typeof data.id !== 'number') {
      throw new UnauthorizedException('Malformed GitHub user profile');
    }

    return {
      id: data.id,
      login: typeof data.login === 'string' ? data.login : undefined,
      name: typeof data.name === 'string' ? data.name : null,
      avatar_url:
        typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
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
    const preferredEmail =
      emails.find((email) => email.primary && email.email)?.email ??
      emails.find((email) => email.email)?.email ??
      null;
    const verifiedEmail =
      emails.find((email) => email.primary && email.verified && email.email)
        ?.email ??
      emails.find((email) => email.verified && email.email)?.email ??
      null;
    const email = verifiedEmail ?? preferredEmail;

    if (!email) {
      throw new UnauthorizedException('GitHub user email is unavailable');
    }

    return {
      subject,
      email,
      emailVerified: Boolean(verifiedEmail),
      fullName: pickDisplayName(
        'GitHub User',
        user.name,
        user.login,
        email.split('@')[0],
      ),
      login: user.login ?? null,
      avatarUrl: user.avatar_url ?? null,
    };
  }

  private buildCookieOptions(maxAgeMs?: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
    };
  }

  private createCodeChallenge(codeVerifier: string): string {
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  private parseCookies(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) {
      return {};
    }

    return cookieHeader
      .split(';')
      .reduce<Record<string, string>>((cookies, cookie) => {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (!name) {
          return cookies;
        }

        cookies[name] = decodeURIComponent(valueParts.join('='));
        return cookies;
      }, {});
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getStateTtlSec(): number {
    return Number(
      this.configService.get<number>('GITHUB_OAUTH_STATE_TTL_SEC') ??
        DEFAULT_GITHUB_OAUTH_STATE_TTL_SEC,
    );
  }

  private normalizeUrl(url: string, key: string): string {
    const normalized = url.trim();
    if (!normalized) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    try {
      return new URL(normalized).toString();
    } catch {
      throw new InternalServerErrorException(`${key} must be a valid URL`);
    }
  }

  private getRequiredUrlConfig(key: 'GITHUB_OAUTH_CALLBACK_URL'): string {
    const value = this.configService.get<string>(key) ?? '';
    return this.normalizeUrl(value, key);
  }

  private getSigningSecret(): string {
    const oauthSecret =
      this.configService.get<string>('GITHUB_OAUTH_STATE_SECRET')?.trim() ?? '';
    const jwtSecret =
      this.configService.get<string>('JWT_SECRET')?.trim() ?? '';
    const secret = oauthSecret || jwtSecret;

    if (!secret) {
      throw new InternalServerErrorException(
        'JWT_SECRET or GITHUB_OAUTH_STATE_SECRET must be configured',
      );
    }

    return secret;
  }

  private getRequiredConfig(key: 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET') {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }

  private buildGithubRequestFailureMessage(
    baseMessage: string,
    error: RequestError,
  ): string {
    if (this.configService.get('NODE_ENV') === 'production') {
      return baseMessage;
    }

    const method = error.request?.method ?? 'REQUEST';
    const url =
      typeof error.request?.url === 'string'
        ? error.request.url
        : 'unknown endpoint';
    const grantedScopes = this.extractGrantedScopes(error);
    const acceptedPermissions = this.extractAcceptedPermissions(error);
    const details = [
      grantedScopes ? `Granted scopes: ${grantedScopes}` : null,
      acceptedPermissions
        ? `Required GitHub App permissions: ${acceptedPermissions}`
        : null,
    ].filter(Boolean);

    if (details.length === 0) {
      return `${baseMessage}: ${method} ${url} returned ${error.status}`;
    }

    return `${baseMessage}: ${method} ${url} returned ${error.status}. ${details.join('. ')}`;
  }

  private extractGrantedScopes(error: RequestError): string | null {
    const scopesHeader = error.response?.headers?.['x-oauth-scopes'];

    if (Array.isArray(scopesHeader)) {
      const value = scopesHeader.join(',').trim();
      return value || '(none)';
    }

    if (typeof scopesHeader === 'string') {
      const value = scopesHeader.trim();
      return value || '(none)';
    }

    return null;
  }

  private extractAcceptedPermissions(error: RequestError): string | null {
    const permissionsHeader =
      error.response?.headers?.['x-accepted-github-permissions'];

    if (Array.isArray(permissionsHeader)) {
      const value = permissionsHeader.join(',').trim();
      return value || null;
    }

    if (typeof permissionsHeader === 'string') {
      const value = permissionsHeader.trim();
      return value || null;
    }

    return null;
  }
}
