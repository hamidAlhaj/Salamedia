import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../decorators/current-user.decorator';
import { REQUIRED_ROLE_KEY } from '../decorators/require-role.decorator';
import { AppError } from '../errors';

/** Runs after JwtAuthGuard. Re-reads the role from the DB so a demotion applies at once. */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role | undefined>(REQUIRED_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const authUser = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!authUser) throw new AppError('UNAUTHENTICATED', 401, 'Authentication required');

    const user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
      select: { role: true },
    });
    if (user?.role !== required) throw new AppError('FORBIDDEN', 403, 'Forbidden');
    return true;
  }
}
