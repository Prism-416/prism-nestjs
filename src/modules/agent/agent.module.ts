import { Module } from '@nestjs/common';
import { AdminModule } from '@/modules/admin';
import {
  AgentActionController,
  AgentController,
  AgentMemoryController,
  AgentWorkflowController,
} from '@/modules/agent/controller';
import { AgentGateway } from '@/modules/agent/gateway';
import { AgentRepository } from '@/modules/agent/repository';
import {
  AgentDispatchService,
  AgentRealtimePublisherService,
  AgentWorkflowDispatchService,
} from '@/modules/agent/services';
import {
  AgentRealtimeSubscriptionUseCase,
  AgentUseCase,
} from '@/modules/agent/usecases';

@Module({
  imports: [AdminModule],
  controllers: [
    AgentController,
    AgentActionController,
    AgentMemoryController,
    AgentWorkflowController,
  ],
  providers: [
    AgentGateway,
    AgentDispatchService,
    AgentRealtimePublisherService,
    AgentWorkflowDispatchService,
    AgentRealtimeSubscriptionUseCase,
    AgentRepository,
    AgentUseCase,
  ],
  exports: [
    AgentDispatchService,
    AgentRealtimePublisherService,
    AgentRepository,
  ],
})
export class AgentModule {}
