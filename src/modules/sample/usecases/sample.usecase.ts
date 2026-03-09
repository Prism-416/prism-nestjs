import { Injectable } from '@nestjs/common';
import { CreateSampleItemDto } from '@/modules/sample/dto';
import { SampleRepository } from '@/modules/sample/repository';

@Injectable()
export class SampleUseCase {
  constructor(private readonly sampleRepository: SampleRepository) {}

  listItems() {
    return this.sampleRepository.findAll();
  }

  createItem(dto: CreateSampleItemDto) {
    return this.sampleRepository.create(dto);
  }
}
