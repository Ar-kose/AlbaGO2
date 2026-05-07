import { Injectable, Module } from '@nestjs/common';
import { InMemoryStore } from '../common/in-memory-store';

@Injectable()
export class UsersService {
  constructor(private readonly store: InMemoryStore) {}

  findAll() {
    return this.store.users;
  }
}

@Module({
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
