import { Injectable } from '@nestjs/common';
import { CreateSampleItemDto } from '@/modules/auth/dto';
import { AuthRepository } from '@/modules/auth/repository';

@Injectable()
export class AuthUseCase {
  constructor(private readonly repo: AuthRepository) {}

  listItems() {
    return this.repo.findAll();
  }

  createItem(dto: CreateSampleItemDto) {
    return this.repo.create(dto);
  }
}
