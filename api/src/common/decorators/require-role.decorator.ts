import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const REQUIRED_ROLE_KEY = 'requiredRole';

/** Use together with @UseGuards(JwtAuthGuard, RoleGuard). */
export const RequireRole = (role: Role) => SetMetadata(REQUIRED_ROLE_KEY, role);
