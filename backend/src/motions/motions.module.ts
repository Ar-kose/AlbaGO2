import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { motionDefinitions } from '../common/contracts';

@ApiTags('motions')
@Controller('motions')
class MotionsController {
  @Get()
  list() {
    return { items: motionDefinitions };
  }
}

@Module({
  controllers: [MotionsController]
})
export class MotionsModule {}
