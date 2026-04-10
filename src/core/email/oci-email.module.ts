import { Module } from '@nestjs/common';
import { OciEmailDeliveryService } from '@/core/email/oci-email-delivery.service';

@Module({
  providers: [OciEmailDeliveryService],
  exports: [OciEmailDeliveryService],
})
export class OciEmailModule {}
