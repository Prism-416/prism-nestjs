import { Module } from '@nestjs/common';
import { OciObjectStorageService } from '@/core/object-storage/oci-object-storage.service';

@Module({
  providers: [OciObjectStorageService],
  exports: [OciObjectStorageService],
})
export class OciObjectStorageModule {}
