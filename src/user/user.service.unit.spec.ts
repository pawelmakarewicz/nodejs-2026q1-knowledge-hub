import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';
import { createPrismaMock } from '../../test/unit/mocks/prisma.mock';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('findAll returns users without password', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: 'u1', login: 'john' }]);

    const result = await service.findAll();

    expect(result).toEqual([{ id: 'u1', login: 'john' }]);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          login: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        }),
      }),
    );
  });

  it('findOne throws when user is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create throws for duplicate login', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'dup' });

    await expect(
      service.create({ login: 'duplicate', password: 'pass' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create hashes password and keeps role', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'u1',
      login: 'new-user',
      role: UserRole.EDITOR,
    });
    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as never);

    const result = await service.create({
      login: 'new-user',
      password: 'plain',
      role: UserRole.EDITOR,
    });

    expect(result.login).toBe('new-user');
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          password: 'hashed-password',
          role: UserRole.EDITOR,
        }),
      }),
    );
  });

  it('updateUser throws when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.updateUser('unknown', {
        oldPassword: 'old',
        newPassword: 'new',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateUser throws when old password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      password: 'stored-hash',
    });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    await expect(
      service.updateUser('u1', {
        oldPassword: 'wrong',
        newPassword: 'new',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updateUser hashes new password and normalizes role', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      password: 'stored-hash',
    });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValueOnce('next-hash' as never);
    prismaMock.user.update.mockResolvedValueOnce({ id: 'u1', role: UserRole.ADMIN });

    await service.updateUser('u1', {
      oldPassword: 'old',
      newPassword: 'new',
      role: 'admin',
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          password: 'next-hash',
          role: 'ADMIN',
        }),
      }),
    );
  });

  it('remove throws for missing user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove uses transaction for existing user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'u1' });
    prismaMock.$transaction.mockResolvedValueOnce(undefined);

    await service.remove('u1');

    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});
