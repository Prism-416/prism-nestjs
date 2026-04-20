import { Module } from '@nestjs/common';
import { OciQueueService } from '@/core/queue/oci-queue.service';

@Module({
  providers: [OciQueueService],
  exports: [OciQueueService],
})
export class OciQueueModule {}
