import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { GithubWebhookService } from '@/modules/github/services/github-webhook.service';

describe('GithubWebhookService', () => {
  const secret = 'webhook-secret';
  const body = Buffer.from(
    JSON.stringify({ zen: 'Keep it logically awesome.' }),
  );

  const createService = (configuredSecret = secret) =>
    new GithubWebhookService({
      get: jest.fn(() => configuredSecret),
    } as unknown as ConfigService);

  const sign = () =>
    `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('accepts a valid GitHub webhook signature', () => {
    expect(() => createService().verifySignature(body, sign())).not.toThrow();
  });

  it('rejects an invalid GitHub webhook signature', () => {
    expect(() =>
      createService().verifySignature(body, 'sha256=invalid'),
    ).toThrow(UnauthorizedException);
  });

  it('requires a configured GitHub webhook secret', () => {
    expect(() => createService('').verifySignature(body, sign())).toThrow(
      InternalServerErrorException,
    );
  });
});
