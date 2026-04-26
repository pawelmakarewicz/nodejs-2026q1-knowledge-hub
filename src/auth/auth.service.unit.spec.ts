import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const userServiceMock = {
    create: vi.fn(),
    findByLogin: vi.fn(),
  };

  const jwtServiceMock = {
    sign: vi.fn(),
    verify: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: userServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('signup delegates to userService.create', async () => {
    userServiceMock.create.mockResolvedValueOnce({ id: 'u1', login: 'john' });

    await service.signup({ login: 'john', password: 'pwd' });

    expect(userServiceMock.create).toHaveBeenCalledWith({ login: 'john', password: 'pwd' });
  });

  it('login throws for missing user', async () => {
    userServiceMock.findByLogin.mockResolvedValueOnce(null);

    await expect(service.login({ login: 'john', password: 'pwd' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('login throws for wrong password', async () => {
    userServiceMock.findByLogin.mockResolvedValueOnce({
      id: 'u1',
      login: 'john',
      password: 'hash',
      role: UserRole.VIEWER,
    });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    await expect(service.login({ login: 'john', password: 'wrong' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('login generates access and refresh tokens with lowercase role', async () => {
    userServiceMock.findByLogin.mockResolvedValueOnce({
      id: 'u1',
      login: 'john',
      password: 'hash',
      role: UserRole.ADMIN,
    });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    jwtServiceMock.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

    const result = await service.login({ login: 'john', password: 'pwd' });

    expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(jwtServiceMock.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userId: 'u1', login: 'john', role: 'admin' }),
      expect.any(Object),
    );
  });

  it('refresh throws for missing token', async () => {
    await expect(service.refresh('')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh rotates both tokens', async () => {
    jwtServiceMock.verify.mockReturnValueOnce({ userId: 'u1', login: 'john', role: 'editor' });
    jwtServiceMock.sign
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('new-refresh-token');

    const result = await service.refresh('valid-refresh-token');

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    expect(jwtServiceMock.verify).toHaveBeenCalledWith(
      'valid-refresh-token',
      expect.any(Object),
    );
  });

  it('refresh throws for tampered or expired token', async () => {
    jwtServiceMock.verify.mockImplementationOnce(() => {
      throw new Error('jwt malformed');
    });

    await expect(service.refresh('broken')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
