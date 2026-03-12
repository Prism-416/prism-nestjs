import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
} from '@/modules/auth/dto';
import { EmailAlreadyExistsError } from '@/modules/auth/errors';

@Injectable()
export class AuthRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createUserWithEmail(
    dto: SignUpWithEmailDto,
  ): Promise<SignUpWithEmailResponseDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const users = await manager.query<SignUpWithEmailResponseDto[]>(
        `
          INSERT INTO users (email, password, name, display_name)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email) DO NOTHING
          RETURNING id, email, name, display_name AS "displayName", created_at AS "createdAt"
        `,
        [dto.email, dto.password, dto.name, dto.displayName],
      );

      if (!users.length) {
        throw new EmailAlreadyExistsError();
      }

      return users[0];
    });
  }
}
