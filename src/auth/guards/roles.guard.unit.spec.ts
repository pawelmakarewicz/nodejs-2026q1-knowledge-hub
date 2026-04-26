import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';

const createContext = (role?: string, method = 'GET') => {
  const request: any = { method, user: role ? { role } : undefined };

  return {
    request,
    context: {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any,
  };
};

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const reflectorMock = {
    getAllAndOverride: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: reflectorMock,
        },
      ],
    }).compile();

    guard = module.get(RolesGuard);
  });

  it('passes for public routes', () => {
    reflectorMock.getAllAndOverride.mockReturnValueOnce(true);
    const { context } = createContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws forbidden when user is missing', () => {
    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(undefined); // requiredRoles
    const { context } = createContext(undefined, 'GET');

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('grants access for admin', () => {
    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);
    const { context } = createContext('admin', 'DELETE');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('checks @Roles metadata and blocks insufficient role', () => {
    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['editor']);
    const { context } = createContext('viewer', 'GET');

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows viewer only GET methods when @Roles metadata is absent', () => {
    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);
    const { context: getContext } = createContext('viewer', 'GET');
    expect(guard.canActivate(getContext)).toBe(true);

    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);
    const { context: postContext } = createContext('viewer', 'POST');
    expect(() => guard.canActivate(postContext)).toThrow(ForbiddenException);
  });

  it('allows editor GET/POST/PUT but blocks DELETE', () => {
    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);
    const { context: putContext } = createContext('editor', 'PUT');
    expect(guard.canActivate(putContext)).toBe(true);

    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);
    const { context: deleteContext } = createContext('editor', 'DELETE');
    expect(() => guard.canActivate(deleteContext)).toThrow(ForbiddenException);
  });
});
