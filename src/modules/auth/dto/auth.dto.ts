import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSampleItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export interface SampleItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}
