import { Module } from '@nestjs/common';
import { OciEmailDeliveryService } from '@/common/email/oci-email-delivery.service';

@Module({
  providers: [OciEmailDeliveryService],
  exports: [OciEmailDeliveryService],
})
export class OciEmailModule {}
