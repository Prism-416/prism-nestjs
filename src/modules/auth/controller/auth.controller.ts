import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSampleItemDto } from '@/modules/sample/dto';
import { SampleUseCase } from '@/modules/sample/usecases';

@ApiTags('auth')
@Controller('/signup')
export class SignUpController {
  constructor(private readonly sampleUseCase: SampleUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Sign Up with Email' })
  list() {
    return this.sampleUseCase.listItems();
  }

  @Post()
  @ApiOperation({ summary: 'Create sample item' })
  create(@Body() dto: CreateSampleItemDto) {
    return this.sampleUseCase.createItem(dto);
  }
}
