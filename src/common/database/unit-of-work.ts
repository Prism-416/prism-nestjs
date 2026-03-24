import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class UnitOfWork {
  constructor(
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    if (!this.dataSource) {
      throw new ServiceUnavailableException('Database is not configured');
    }

    return this.dataSource.transaction(work);
  }
}
