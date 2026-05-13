import { Body, Controller, Injectable, Module, Post, UseGuards } from '@nestjs/common';
import { AdminTokenGuard } from '../common/admin-token.guard';
import { ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsIn } from 'class-validator';
import { validateGamePackage } from './game-package.validator';
import { mapGamePackageToEntity } from './game-package.mapper';
import { GameDefinitionsRepository } from '../persistence/game-definitions.repository';
import { createAuditEntry } from '../common/publish-validation';
import { AuditLogsRepository } from '../persistence/audit-logs.repository';

class ValidatePackageDto {
  @IsObject()
  package!: Record<string, unknown>;
}

class ImportPackageDto {
  @IsObject()
  package!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT'])
  createMode?: string;
}

@Injectable()
export class GamePackagesService {
  constructor(
    private readonly gameDefinitionsRepository: GameDefinitionsRepository,
    private readonly auditLogsRepository: AuditLogsRepository
  ) {}

  validate(pkg: unknown) {
    return validateGamePackage(pkg);
  }

  async import(pkg: unknown) {
    const validation = validateGamePackage(pkg);
    if (!validation.valid) {
      return { imported: false, validation };
    }

    const entity = mapGamePackageToEntity(pkg as any);
    await this.gameDefinitionsRepository.save(entity);
    await this.auditLogsRepository.record(
      createAuditEntry('admin@local', 'import_package', 'GameDefinition', entity.id, undefined, {
        title: entity.title,
        template: entity.templateKey,
        source: 'ALBAGO_GAME_PACKAGE'
      })
    );

    return {
      imported: true,
      gameDefinitionId: entity.id,
      status: 'DRAFT',
      redirectTo: `/games/${entity.id}/studio`
    };
  }
}

@ApiTags('game-packages')
@Controller('internal/game-packages')
@UseGuards(AdminTokenGuard)
class GamePackagesController {
  constructor(private readonly service: GamePackagesService) {}

  @Post('validate')
  async validate(@Body() dto: ValidatePackageDto) {
    return this.service.validate(dto.package);
  }

  @Post('import')
  async import(@Body() dto: ImportPackageDto) {
    return this.service.import(dto.package);
  }
}

@Module({
  controllers: [GamePackagesController],
  providers: [GamePackagesService],
  exports: [GamePackagesService]
})
export class GamePackagesModule {}
