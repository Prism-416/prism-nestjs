import { Module } from '@nestjs/common';
import {
  AgentActionController,
  AgentController,
} from '@/modules/agent/controller';
import { AgentRepository } from '@/modules/agent/repository';
import { AgentUseCase } from '@/modules/agent/usecases';

@Module({
  controllers: [AgentController, AgentActionController],
  providers: [AgentRepository, AgentUseCase],
})
export class AgentModule {}
