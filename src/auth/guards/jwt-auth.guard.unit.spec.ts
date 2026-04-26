import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

const createContext = (headers: Record<string, string | undefined> = {}) => {
  const request: any = { headers };

  return {
    request,
    context: {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any,
  };
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const jwtServiceMock = {
    verify: vi.fn(),
  };

  const reflectorMock = {
    getAllAndOverride: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: Reflector, useValue: reflectorMock },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
  });

  it('passes public routes without token', async () => {
    reflectorMock.getAllAndOverride.mockReturnValueOnce(true);
    const { context } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('passes valid token and writes payload to request.user', async () => {
    reflectorMock.getAllAndOverride.mockReturnValueOnce(false);
    jwtServiceMock.verify.mockReturnValueOnce({ userId: 'u1', role: 'admin' });
    const { context, request } = createContext({ authorization: 'Bearer token123' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ userId: 'u1', role: 'admin' });
  });

  it('throws when authorization header is missing', async () => {
    reflectorMock.getAllAndOverride.mockReturnValueOnce(false);
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when authorization header is malformed', async () => {
    reflectorMock.getAllAndOverride.mockReturnValueOnce(false);
    const { context } = createContext({ authorization: 'BadFormat token123' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when token is expired or invalid', async () => {
    reflectorMock.getAllAndOverride.mockReturnValueOnce(false);
    jwtServiceMock.verify.mockImplementationOnce(() => {
      throw new Error('jwt expired');
    });
    const { context } = createContext({ authorization: 'Bearer expired' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
