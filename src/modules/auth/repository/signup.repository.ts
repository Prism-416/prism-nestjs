import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { UserRow } from '@/modules/auth/types';

@Injectable()
export class SignUpRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private getManager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }

  async getUserByUsername(username: string, manager?: EntityManager) {
    return await this.getManager(manager).query<UserRow>(
      `
        SELECT user_id AS "userId",
               username
        FROM prism_users_l
        WHERE username = $1
      `,
      [username],
    );
  }
}
