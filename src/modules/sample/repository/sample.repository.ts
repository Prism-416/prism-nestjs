import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateSampleItemDto, SampleItem } from '@/modules/sample/dto';

@Injectable()
export class SampleRepository {
  private readonly items: SampleItem[] = [];

  findAll(): SampleItem[] {
    return this.items;
  }

  create(dto: CreateSampleItemDto): SampleItem {
    const item: SampleItem = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      createdAt: new Date().toISOString(),
    };
    this.items.push(item);
    return item;
  }
}
