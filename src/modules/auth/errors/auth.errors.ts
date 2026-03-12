import { NotExistsError } from '@/common/errors/domain-error';

export class SampleItemNotFoundError extends NotExistsError {
  constructor() {
    super('Sample item not found.', 'SAMPLE_ITEM_NOT_FOUND');
  }
}
