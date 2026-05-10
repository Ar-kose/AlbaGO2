import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  NotFoundException,
  Put
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { createId } from '../common/contracts';
import { InMemoryStore } from '../common/in-memory-store';
import { PersistenceModule } from '../persistence/persistence.module';
import { PrismaService } from '../persistence/prisma.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}

export interface ProfileResponse {
  id: string;
  guestToken?: string;
  displayName?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  note?: string;
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly prisma: PrismaService
  ) {}

  async getOrCreateProfile(guestToken?: string, deviceId?: string): Promise<ProfileResponse> {
    const token = guestToken || deviceId || `guest-${createId('anon')}`;

    if (this.prisma.client) {
      let user = await this.prisma.client.user.findUnique({ where: { guestToken: token } });
      if (!user) {
        user = await this.prisma.client.user.create({
          data: {
            id: createId('user'),
            guestToken: token,
            displayName: '',
            status: 'ACTIVE',
            createdAt: new Date()
          }
        });
      }
      return {
        id: user.id,
        guestToken: user.guestToken,
        displayName: user.displayName || undefined,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        note: 'Device profile. Account system pending.'
      };
    }

    // In-memory fallback
    const existing = this.store.users.find(u => u.guestToken === token);
    if (existing) {
      return {
        id: existing.id,
        guestToken: existing.guestToken,
        displayName: existing.displayName,
        status: existing.status,
        createdAt: existing.createdAt,
        note: 'Device profile (in-memory). Account system pending.'
      };
    }

    const created = {
      id: createId('user'),
      guestToken: token,
      displayName: '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    this.store.users.push(created as any);

    return {
      ...created,
      note: 'Device profile (in-memory). Account system pending.'
    };
  }

  async updateProfile(
    guestToken: string | undefined,
    deviceId: string | undefined,
    dto: UpdateProfileDto
  ): Promise<ProfileResponse> {
    const token = guestToken || deviceId;
    if (!token) {
      throw new BadRequestException('X-Alba-Guest-Token or X-Alba-Device-Id header required');
    }

    if (dto.displayName !== undefined) {
      const trimmed = dto.displayName.trim();
      if (trimmed.length === 0) {
        throw new BadRequestException('displayName must not be empty');
      }
      if (trimmed.length > 80) {
        throw new BadRequestException('displayName must be at most 80 characters');
      }
    }

    if (this.prisma.client) {
      const user = await this.prisma.client.user.findUnique({ where: { guestToken: token } });
      if (!user) {
        throw new NotFoundException('Profile not found');
      }

      const updated = await this.prisma.client.user.update({
        where: { guestToken: token },
        data: {
          displayName: dto.displayName ?? user.displayName
        }
      });

      return {
        id: updated.id,
        guestToken: updated.guestToken,
        displayName: updated.displayName || undefined,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        note: 'Device profile. Account system pending.'
      };
    }

    const idx = this.store.users.findIndex(u => u.guestToken === token);
    if (idx < 0) {
      throw new NotFoundException('Profile not found');
    }

    if (dto.displayName !== undefined) {
      this.store.users[idx] = { ...this.store.users[idx], displayName: dto.displayName };
    }

    const u = this.store.users[idx];
    return {
      id: u.id,
      guestToken: u.guestToken,
      displayName: u.displayName,
      status: u.status,
      createdAt: u.createdAt,
      note: 'Device profile (in-memory). Account system pending.'
    };
  }
}

@ApiTags('profiles')
@Controller('profiles')
class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Get('me')
  async getProfile(
    @Headers('x-alba-guest-token') guestToken?: string,
    @Headers('x-alba-device-id') deviceId?: string
  ): Promise<ProfileResponse> {
    return this.service.getOrCreateProfile(guestToken, deviceId);
  }

  @Put('me')
  async updateProfile(
    @Headers('x-alba-guest-token') guestToken: string,
    @Headers('x-alba-device-id') deviceId: string,
    @Body() dto: UpdateProfileDto
  ): Promise<ProfileResponse> {
    return this.service.updateProfile(guestToken, deviceId, dto);
  }
}

@Module({
  imports: [PersistenceModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService]
})
export class ProfilesModule {}
