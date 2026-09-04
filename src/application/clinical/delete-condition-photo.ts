import type { PhotoStorage } from '@/application/ports/photo-storage';
import type { ConditionPhotoRepository } from '@/domain/clinical/clinical-repositories';
import { NotFoundError } from '@/domain/shared/errors';

/** Exclusão restrita a correção de upload errado — sempre auditada na rota. */
export class DeleteConditionPhoto {
  constructor(
    private readonly photos: ConditionPhotoRepository,
    private readonly storage: PhotoStorage,
  ) {}

  async execute(input: { id: string }): Promise<void> {
    const photo = await this.photos.findById(input.id);
    if (!photo) {
      throw new NotFoundError('Foto', input.id);
    }
    await this.photos.delete(photo.id);
    await this.storage.remove(photo.id);
  }
}
