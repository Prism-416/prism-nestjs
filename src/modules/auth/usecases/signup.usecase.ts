import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/common/database';
import { SignUpRepository } from '@/modules/auth/repository';
import { UsernameAlreadyExistsError } from '@/modules/auth/errors';

@Injectable()
export class SignUpUseCase {
  constructor(
    private readonly repo: SignUpRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async checkUsername(username: string) {
    return this.uow.run(async (manager) => {
      const user = await this.repo.getUserByUsername(username, manager);
      if (user) {
        return new UsernameAlreadyExistsError();
      }
    });
  }
}
