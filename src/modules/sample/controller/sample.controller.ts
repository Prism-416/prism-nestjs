import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSampleItemDto } from '@/modules/sample/dto';
import { SampleUseCase } from '@/modules/sample/usecases';

@ApiTags('sample')
@Controller('sample/items')
export class SampleController {
  constructor(private readonly sampleUseCase: SampleUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List sample items' })
  list() {
    return this.sampleUseCase.listItems();
  }

  @Post()
  @ApiOperation({ summary: 'Create sample item' })
  create(@Body() dto: CreateSampleItemDto) {
    return this.sampleUseCase.createItem(dto);
  }
}
