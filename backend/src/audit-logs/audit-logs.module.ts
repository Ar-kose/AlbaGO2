import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogsRepository } from '../persistence/audit-logs.repository';

@ApiTags('audit-logs')
@Controller('internal/audit-logs')
class AuditLogsController {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  @Get()
  async list() {
    return { items: await this.auditLogsRepository.list() };
  }
}

@Module({
  controllers: [AuditLogsController]
})
export class AuditLogsModule {}
