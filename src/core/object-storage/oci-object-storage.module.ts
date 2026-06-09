import { Module } from '@nestjs/common';
import { ObjectStorageDeletionService } from '@/core/object-storage/object-storage-deletion.service';
import { OciObjectStorageService } from '@/core/object-storage/oci-object-storage.service';

@Module({
  providers: [OciObjectStorageService, ObjectStorageDeletionService],
  exports: [OciObjectStorageService, ObjectStorageDeletionService],
})
export class OciObjectStorageModule {}
