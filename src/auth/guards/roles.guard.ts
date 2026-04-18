import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const role: string = user.role; // 'admin', 'editor', 'viewer'
    const method: string = request.method; // GET, POST, PUT, DELETE

    if (role === 'admin') return true;

    if (requiredRoles) {
      if (!requiredRoles.includes(role)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }

    if (role === 'viewer') {
      if (method === 'GET') return true;
      throw new ForbiddenException('Viewers can only perform read operations');
    }

    if (role === 'editor') {
      if (method === 'GET' || method === 'POST' || method === 'PUT') {
        return true;
      }
      throw new ForbiddenException('Editors cannot delete resources');
    }

    throw new ForbiddenException('Access denied');
  }
}
