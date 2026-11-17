import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { ErrorResponse } from '../common/errors';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SearchUsersDto } from './dto/search-users.dto';
import { ProfileUser, PublicUser, UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiResponse({ status: 401, type: ErrorResponse, description: 'UNAUTHENTICATED' })
@ApiResponse({ status: 403, type: ErrorResponse, description: 'ACCOUNT_SUSPENDED' })
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Declared before ':username' so "search" is never captured as a username.
  @Get('search')
  @ApiResponse({ status: 200, type: [PublicUser], description: 'Active users only, at most 20' })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (q must be 1–50 characters)' })
  search(@Query() dto: SearchUsersDto): Promise<PublicUser[]> {
    return this.users.search(dto.q);
  }

  @Get(':username')
  @ApiResponse({ status: 200, type: ProfileUser })
  @ApiResponse({ status: 404, type: ErrorResponse, description: 'NOT_FOUND (unknown, or suspended for non-admins)' })
  profile(@Param('username') username: string, @CurrentUser() viewer: AuthUser): Promise<ProfileUser> {
    return this.users.getProfile(username, viewer);
  }
}
