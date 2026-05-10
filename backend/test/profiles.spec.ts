import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InMemoryStore } from '../src/common/in-memory-store';
import { ProfilesService } from '../src/profiles/profiles.module';
import { PrismaService } from '../src/persistence/prisma.service';

describe('profiles', () => {
  let service: ProfilesService;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    process.env.ALLOW_IN_MEMORY_FALLBACK = 'true';
    const store = new InMemoryStore();
    const prisma = new PrismaService();
    service = new ProfilesService(store, prisma);
    delete process.env.ALLOW_IN_MEMORY_FALLBACK;
  });

  describe('getOrCreateProfile', () => {
    it('creates a guest profile when no token exists', async () => {
      const profile = await service.getOrCreateProfile(undefined, undefined);
      expect(profile.id).toMatch(/^user_/);
      expect(profile.guestToken).toBeTruthy();
      expect(profile.status).toBe('ACTIVE');
      expect(profile.note).toContain('Device profile');
    });

    it('returns the same profile for the same guest token', async () => {
      const first = await service.getOrCreateProfile('test-guest-1', undefined);
      const second = await service.getOrCreateProfile('test-guest-1', undefined);
      expect(second.id).toBe(first.id);
      expect(second.guestToken).toBe('test-guest-1');
    });

    it('creates different profiles for different tokens', async () => {
      const a = await service.getOrCreateProfile('guest-a', undefined);
      const b = await service.getOrCreateProfile('guest-b', undefined);
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('updateProfile', () => {
    it('updates displayName for an existing profile', async () => {
      const profile = await service.getOrCreateProfile('update-test', undefined);
      const updated = await service.updateProfile('update-test', undefined, { displayName: 'Test User' });
      expect(updated.displayName).toBe('Test User');
      expect(updated.guestToken).toBe('update-test');
    });

    it('rejects update without a guest token', async () => {
      await expect(
        service.updateProfile(undefined, undefined, { displayName: 'No ID' })
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty displayName', async () => {
      await service.getOrCreateProfile('empty-test', undefined);
      await expect(
        service.updateProfile('empty-test', undefined, { displayName: '   ' })
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects update for non-existent profile', async () => {
      await expect(
        service.updateProfile('nonexistent', undefined, { displayName: 'Ghost' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns note about account system pending', async () => {
      const profile = await service.getOrCreateProfile('note-test', undefined);
      expect(profile.note).toContain('Account system pending');
    });
  });
});
