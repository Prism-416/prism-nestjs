import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const DEFAULT_FAILURE_LIMIT = 5;
const DEFAULT_FAILURE_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_BAN_MS = 15 * 60 * 1000;
const MIN_PRUNE_INTERVAL_MS = 60 * 1000;

type AdminPasswordAttemptState = {
  attempts: number;
  windowStartedAt: number;
  bannedUntil: number | null;
};

@Injectable()
export class AdminPasswordAttemptLimiterService {
  private readonly attemptsByClient = new Map<
    string,
    AdminPasswordAttemptState
  >();
  private lastPrunedAt = 0;

  constructor(private readonly configService: ConfigService) {}

  getClientKey(request: Request): string {
    return this.normalizeClientAddress(
      request.ip ?? request.socket.remoteAddress,
    );
  }

  getRetryAfterSeconds(clientKey: string, now = Date.now()): number | null {
    this.pruneExpiredAttempts(now);
    const state = this.attemptsByClient.get(clientKey);
    if (!state?.bannedUntil) {
      return null;
    }

    if (state.bannedUntil <= now) {
      this.attemptsByClient.delete(clientKey);
      return null;
    }

    return this.toRetryAfterSeconds(state.bannedUntil, now);
  }

  recordFailure(clientKey: string, now = Date.now()): number | null {
    this.pruneExpiredAttempts(now);

    let existingState = this.attemptsByClient.get(clientKey);
    if (existingState?.bannedUntil && existingState.bannedUntil > now) {
      return this.toRetryAfterSeconds(existingState.bannedUntil, now);
    }

    if (existingState?.bannedUntil && existingState.bannedUntil <= now) {
      this.attemptsByClient.delete(clientKey);
      existingState = undefined;
    }

    const windowMs = this.getFailureWindowMs();
    const state =
      existingState && now - existingState.windowStartedAt <= windowMs
        ? existingState
        : {
            attempts: 0,
            windowStartedAt: now,
            bannedUntil: null,
          };

    state.attempts += 1;

    if (state.attempts >= this.getFailureLimit()) {
      state.bannedUntil = now + this.getBanMs();
      state.windowStartedAt = now;
    }

    this.attemptsByClient.set(clientKey, state);

    return state.bannedUntil && state.bannedUntil > now
      ? this.toRetryAfterSeconds(state.bannedUntil, now)
      : null;
  }

  recordSuccess(clientKey: string): void {
    this.attemptsByClient.delete(clientKey);
  }

  private normalizeClientAddress(address: string | undefined): string {
    const normalized = address?.trim();
    if (!normalized) {
      return 'unknown';
    }

    return normalized.startsWith('::ffff:')
      ? normalized.slice('::ffff:'.length)
      : normalized;
  }

  private getFailureLimit(): number {
    return this.getNumberConfig(
      'ADMIN_PASSWORD_FAILURE_LIMIT',
      DEFAULT_FAILURE_LIMIT,
    );
  }

  private getFailureWindowMs(): number {
    return this.getNumberConfig(
      'ADMIN_PASSWORD_FAILURE_WINDOW_MS',
      DEFAULT_FAILURE_WINDOW_MS,
    );
  }

  private getBanMs(): number {
    return this.getNumberConfig('ADMIN_PASSWORD_BAN_MS', DEFAULT_BAN_MS);
  }

  private getNumberConfig(key: string, fallback: number): number {
    const configured = Number(this.configService.get<number | string>(key));
    return Number.isFinite(configured) && configured > 0
      ? configured
      : fallback;
  }

  private pruneExpiredAttempts(now: number): void {
    if (now - this.lastPrunedAt < MIN_PRUNE_INTERVAL_MS) {
      return;
    }

    const windowMs = this.getFailureWindowMs();
    for (const [clientKey, state] of this.attemptsByClient) {
      if (state.bannedUntil && state.bannedUntil > now) {
        continue;
      }

      if (now - state.windowStartedAt <= windowMs) {
        continue;
      }

      this.attemptsByClient.delete(clientKey);
    }

    this.lastPrunedAt = now;
  }

  private toRetryAfterSeconds(until: number, now: number): number {
    return Math.max(1, Math.ceil((until - now) / 1000));
  }
}
