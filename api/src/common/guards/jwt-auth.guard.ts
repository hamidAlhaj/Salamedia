import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../decorators/current-user.decorator';
import { AppError } from '../errors';

interface AccessPayload {
  sub: number | string;
  aud?: string | string[];
}

/**
 * Verifies the Bearer JWT, then loads the user's role and status LIVE on every request,
 * so a suspension takes effect immediately. Socket tickets (aud "socket") are refused here.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthenticated();

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token, { algorithms: ['HS256'] });
    } catch {
      throw unauthenticated();
    }
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (aud.includes('socket')) throw unauthenticated();

    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) throw unauthenticated();

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });
    if (!user) throw unauthenticated();
    if (user.status === 'SUSPENDED') {
      throw new AppError('ACCOUNT_SUSPENDED', 403, 'Account suspended');
    }

    req.user = { id: user.id, role: user.role };
    return true;
  }
}

const unauthenticated = () => new AppError('UNAUTHENTICATED', 401, 'Authentication required');
