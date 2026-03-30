import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(@Optional() private readonly dataSource?: DataSource) {}

  getHealth() {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const dbEnabled =
      (process.env.DB_ENABLED ?? 'false').toLowerCase() === 'true';
    if (!dbEnabled) {
      return {
        status: 'ok',
        checks: {
          database: 'skipped',
        },
      };
    }

    if (!this.dataSource?.isInitialized) {
      throw new ServiceUnavailableException('Database is not initialized');
    }

    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database is unreachable');
    }

    return {
      status: 'ok',
      checks: {
        database: 'up',
      },
    };
  }
}
