import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '@/core/database';
import {
  CreateSprintDto,
  SprintResponseDto,
  UpdateSprintMetadataDto,
} from '@/modules/sprint/dto';
import {
  isSprintNameUniqueViolation,
  isSprintPeriodCheckViolation,
  SprintAlreadyExistsError,
  SprintNotFoundError,
  SprintPeriodInvalidError,
  SprintProjectNotFoundError,
} from '@/modules/sprint/errors';
import { SprintRepository } from '@/modules/sprint/repository';
import { SPRINT_STATUSES } from '@/modules/sprint/types';

@Injectable()
export class SprintUseCase {
  constructor(
    private readonly sprintRepository: SprintRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async createSprint(
    userId: string,
    projectId: string,
    dto: CreateSprintDto,
  ): Promise<SprintResponseDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new SprintPeriodInvalidError();
    }

    return this.uow.run(async (manager) => {
      const project =
        await this.sprintRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new SprintProjectNotFoundError();
      }

      try {
        return await this.sprintRepository.createSprint(
          {
            projectId: project.projectId,
            name: dto.name,
            description: dto.description,
            startsAt,
            endsAt,
            status: dto.status ?? SPRINT_STATUSES[0],
          },
          manager,
        );
      } catch (error) {
        if (isSprintNameUniqueViolation(error)) {
          throw new SprintAlreadyExistsError();
        }

        if (isSprintPeriodCheckViolation(error)) {
          throw new SprintPeriodInvalidError();
        }

        throw error;
      }
    });
  }

  async updateSprintMetadata(
    userId: string,
    projectId: string,
    sprintId: string,
    dto: UpdateSprintMetadataDto,
  ): Promise<SprintResponseDto> {
    return this.uow.run(async (manager) => {
      const project =
        await this.sprintRepository.findProjectByIdAndMemberUserId(
          projectId,
          userId,
          manager,
        );
      if (!project) {
        throw new SprintProjectNotFoundError();
      }

      const currentSprint = await this.sprintRepository.findSprintById(
        project.projectId,
        sprintId,
        manager,
      );
      if (!currentSprint) {
        throw new SprintNotFoundError();
      }

      const startsAt =
        dto.startsAt !== undefined
          ? new Date(dto.startsAt)
          : currentSprint.startsAt;
      const endsAt =
        dto.endsAt !== undefined ? new Date(dto.endsAt) : currentSprint.endsAt;

      if (startsAt >= endsAt) {
        throw new SprintPeriodInvalidError();
      }

      try {
        const updatedSprint = await this.sprintRepository.updateSprintMetadata(
          {
            projectId: project.projectId,
            sprintId,
            name: dto.name ?? currentSprint.name,
            description: dto.description ?? currentSprint.description,
            startsAt,
            endsAt,
            status: dto.status ?? currentSprint.status,
          },
          manager,
        );
        if (!updatedSprint) {
          throw new SprintNotFoundError();
        }

        return updatedSprint;
      } catch (error) {
        if (isSprintNameUniqueViolation(error)) {
          throw new SprintAlreadyExistsError();
        }

        if (isSprintPeriodCheckViolation(error)) {
          throw new SprintPeriodInvalidError();
        }

        throw error;
      }
    });
  }
}
