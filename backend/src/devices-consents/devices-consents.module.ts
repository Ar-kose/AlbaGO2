import { Body, Controller, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { createId } from '../common/contracts';
import { InMemoryStore } from '../common/in-memory-store';

class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  installId!: string;

  @IsString()
  @IsIn(['ANDROID'])
  platform!: 'ANDROID';

  @IsString()
  @IsNotEmpty()
  appVersion!: string;

  @IsOptional()
  @IsString()
  pushToken?: string;

  @IsString()
  @IsNotEmpty()
  consentVersion!: string;
}

@Injectable()
class DevicesService {
  constructor(private readonly store: InMemoryStore) {}

  register(dto: RegisterDeviceDto) {
    const device = {
      id: createId('device'),
      createdAt: new Date().toISOString(),
      ...dto
    };
    this.store.devices.push(device);
    return device;
  }
}

@ApiTags('devices')
@Controller('devices/register')
class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Post()
  register(@Body() dto: RegisterDeviceDto) {
    return this.service.register(dto);
  }
}

@Module({
  controllers: [DevicesController],
  providers: [
    {
      provide: DevicesService,
      useFactory: (store: InMemoryStore) => new DevicesService(store),
      inject: [InMemoryStore]
    }
  ]
})
export class DevicesConsentsModule {}
