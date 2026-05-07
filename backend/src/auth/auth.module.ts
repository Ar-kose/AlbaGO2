import { Body, Controller, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { InMemoryStore } from '../common/in-memory-store';
import { createId } from '../common/contracts';

class CreateGuestSessionDto {
  @IsString()
  @IsNotEmpty()
  installId!: string;

  @IsString()
  @IsIn(['ANDROID'])
  platform!: 'ANDROID';

  @IsString()
  @IsNotEmpty()
  appVersion!: string;
}

@Injectable()
class AuthService {
  constructor(private readonly store: InMemoryStore) {}

  createGuestSession(dto: CreateGuestSessionDto) {
    const user = {
      id: createId('user'),
      guestToken: createId('guest'),
      displayName: `Guest-${dto.installId.slice(0, 6)}`,
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString()
    };
    this.store.users.push(user);
    return {
      guestToken: user.guestToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
    };
  }
}

@ApiTags('auth')
@Controller('guest-sessions')
class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  create(@Body() dto: CreateGuestSessionDto) {
    return this.authService.createGuestSession(dto);
  }
}

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      useFactory: (store: InMemoryStore) => new AuthService(store),
      inject: [InMemoryStore]
    }
  ]
})
export class AuthModule {}
