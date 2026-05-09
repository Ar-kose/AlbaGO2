import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminTokenGuard } from '../common/admin-token.guard';
import { AuditLogsRepository } from '../persistence/audit-logs.repository';

@ApiTags('audit-logs')
@Controller('internal/audit-logs')
@UseGuards(AdminTokenGuard)
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
