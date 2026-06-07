import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

@Injectable()
export class GithubWebhookService {
  constructor(private readonly configService: ConfigService) {}

  verifySignature(rawBody: Buffer, signatureHeader?: string): void {
    const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET', '');

    if (!secret) {
      throw new InternalServerErrorException(
        'GitHub webhook secret is not configured.',
      );
    }

    if (!signatureHeader?.startsWith('sha256=')) {
      throw new UnauthorizedException('Invalid GitHub webhook signature.');
    }

    const expectedSignature = `sha256=${createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')}`;

    if (
      !this.safeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expectedSignature),
      )
    ) {
      throw new UnauthorizedException('Invalid GitHub webhook signature.');
    }
  }

  private safeEqual(left: Buffer, right: Buffer): boolean {
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
